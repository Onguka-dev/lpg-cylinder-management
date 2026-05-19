import { Prisma, type PrismaClient, type SapSourceModule } from "@prisma/client";
import { generateIntegrationReference, mockIntegrationSend } from "@/lib/integrations";

type SapPostingClient = Pick<
  PrismaClient,
  "integrationSetting" | "integrationLog" | "sapPostingQueue" | "customer" | "masterDataRecord"
>;

export const sapPostingStatuses = ["QUEUED", "POSTED", "FAILED", "RETRY_QUEUED", "MISMATCHED"] as const;
export const sapSourceModules = ["SUPPLIER_RECEIPT", "INVENTORY_MOVEMENT", "FULL_CYLINDER_SALE", "REFILL_ORDER", "FIELD_SALE", "EMPTY_RETURN", "SCRAP_WRITE_OFF"] as const;

export type SapQueueInput = {
  sourceModule: SapSourceModule;
  sourceRecordId: string;
  sourceReference: string;
  action: string;
  customerId?: string | null;
  skuId?: string | null;
  plantLocationId?: string | null;
  storageLocationId?: string | null;
  amount?: Prisma.Decimal | number | string | null;
  payload: Prisma.InputJsonValue;
  createdById?: string | null;
  forceFailure?: boolean;
};

export function sapDocumentPlaceholder(sourceModule: SapSourceModule, sourceReference: string) {
  return `MOCK-SAP-${sourceModule}-${sourceReference}`.replaceAll("/", "-").slice(0, 80);
}

export async function enqueueSapPosting(db: SapPostingClient, input: SapQueueInput) {
  const [setting, customer, sku, plantLocation, storageLocation] = await Promise.all([
    db.integrationSetting.findUnique({ where: { providerType: "SAP_ACCOUNTING" } }),
    input.customerId ? db.customer.findUnique({ where: { id: input.customerId }, select: { sapCustomerCode: true, name: true, phone: true } }) : null,
    input.skuId ? db.masterDataRecord.findUnique({ where: { id: input.skuId }, select: { sapMaterialCode: true, code: true, name: true } }) : null,
    input.plantLocationId ? db.masterDataRecord.findUnique({ where: { id: input.plantLocationId }, select: { sapPlantCode: true, code: true, name: true } }) : null,
    input.storageLocationId ? db.masterDataRecord.findUnique({ where: { id: input.storageLocationId }, select: { sapStorageLocationCode: true, sapPlantCode: true, code: true, name: true } }) : null
  ]);

  const payload = {
    ...(typeof input.payload === "object" && input.payload ? input.payload : { value: input.payload }),
    mockPricing: "Demo pricing/tax values come from Wells Gas app data until SAP pricing is connected.",
    sapMapping: {
      customer: customer?.sapCustomerCode ?? null,
      material: sku?.sapMaterialCode ?? null,
      plant: plantLocation?.sapPlantCode ?? storageLocation?.sapPlantCode ?? null,
      storageLocation: storageLocation?.sapStorageLocationCode ?? null
    }
  } as Prisma.InputJsonObject;

  try {
    const queue = await db.sapPostingQueue.create({
      data: {
        sourceModule: input.sourceModule,
        sourceRecordId: input.sourceRecordId,
        sourceReference: input.sourceReference,
        action: input.action,
        status: "QUEUED",
        sapDocumentNo: sapDocumentPlaceholder(input.sourceModule, input.sourceReference),
        sapCustomerCode: customer?.sapCustomerCode ?? null,
        sapMaterialCode: sku?.sapMaterialCode ?? null,
        sapPlantCode: plantLocation?.sapPlantCode ?? storageLocation?.sapPlantCode ?? null,
        sapStorageLocationCode: storageLocation?.sapStorageLocationCode ?? null,
        amount: input.amount === null || input.amount === undefined ? null : new Prisma.Decimal(input.amount),
        payload,
        createdById: input.createdById ?? null
      }
    });

    return postSapQueueItem(db, queue.id, {
      forceFailure: input.forceFailure,
      settingId: setting?.id ?? null,
      mockFailureRate: setting?.isEnabled ? setting.mockFailureRate : 100,
      disabledReason: setting?.isEnabled === false ? "SAP mock posting setting is disabled." : undefined
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return db.sapPostingQueue.findUnique({
        where: { sourceModule_sourceRecordId: { sourceModule: input.sourceModule, sourceRecordId: input.sourceRecordId } }
      });
    }
    throw error;
  }
}

export async function safeEnqueueSapPosting(db: SapPostingClient, input: SapQueueInput) {
  try {
    return await enqueueSapPosting(db, input);
  } catch (error) {
    await db.integrationLog.create({
      data: {
        reference: generateIntegrationReference(),
        providerType: "SAP_ACCOUNTING",
        action: input.action,
        requestStatus: "FAILED",
        responseStatus: "FAILED",
        relatedRecord: `${input.sourceModule}:${input.sourceRecordId}`,
        errorMessage: error instanceof Error ? error.message : "SAP mock queue creation failed.",
        payload: input.payload
      }
    }).catch(() => null);
    return null;
  }
}

export async function postSapQueueItem(
  db: SapPostingClient,
  queueId: string,
  options?: { forceFailure?: boolean; settingId?: string | null; mockFailureRate?: number; disabledReason?: string }
) {
  const queue = await db.sapPostingQueue.findUnique({ where: { id: queueId } });
  if (!queue) throw new Error("SAP_QUEUE_ITEM_NOT_FOUND");

  const result = options?.disabledReason
    ? { ok: false, errorMessage: options.disabledReason }
    : mockIntegrationSend({ forceFailure: options?.forceFailure, mockFailureRate: options?.mockFailureRate, payload: queue.payload });
  const responsePayload = result.ok && "response" in result ? result.response : null;
  const errorMessage = result.ok ? null : ("errorMessage" in result ? result.errorMessage : "SAP mock posting failed.");
  const queuePayload = queue.payload === null ? Prisma.JsonNull : queue.payload as Prisma.InputJsonValue;
  const jsonResponsePayload = responsePayload ?? Prisma.JsonNull;

  const log = await db.integrationLog.create({
    data: {
      reference: generateIntegrationReference(),
      providerType: "SAP_ACCOUNTING",
      settingId: options?.settingId ?? null,
      action: queue.action,
      requestStatus: result.ok ? "SUCCESS" : "FAILED",
      responseStatus: result.ok ? "SUCCESS" : "FAILED",
      relatedRecord: `${queue.sourceModule}:${queue.sourceRecordId}`,
      errorMessage,
      retryCount: queue.retryCount,
      payload: queuePayload,
      responsePayload: jsonResponsePayload,
      createdById: queue.createdById
    }
  });

  return db.sapPostingQueue.update({
    where: { id: queue.id },
    data: {
      status: result.ok ? "POSTED" : "FAILED",
      integrationLogId: log.id,
      responsePayload: jsonResponsePayload,
      errorMessage,
      postedAt: result.ok ? new Date() : null
    }
  });
}

export async function retrySapQueueItem(db: SapPostingClient, queueId: string, forceFailure = false) {
  const setting = await db.integrationSetting.findUnique({ where: { providerType: "SAP_ACCOUNTING" } });
  await db.sapPostingQueue.update({
    where: { id: queueId },
    data: { status: "RETRY_QUEUED", retryCount: { increment: 1 } }
  });
  return postSapQueueItem(db, queueId, {
    forceFailure,
    settingId: setting?.id ?? null,
    mockFailureRate: setting?.isEnabled ? setting.mockFailureRate : 100,
    disabledReason: setting?.isEnabled === false ? "SAP mock posting setting is disabled." : undefined
  });
}
