import { z } from "zod";
import type { AppRole } from "@/lib/auth-types";
import { customerSchema } from "@/lib/customers";
import { deliveryStatusSchema } from "@/lib/deliveries";
import { fieldSaleSchema } from "@/lib/field-sales";

export const offlineSyncItemTypes = [
  "ASSIGNED_DELIVERY_SNAPSHOT",
  "VEHICLE_STOCK_SNAPSHOT",
  "CUSTOMER_DRAFT",
  "DELIVERY_STATUS_DRAFT",
  "PROOF_OF_DELIVERY_DRAFT",
  "FIELD_SALE_DRAFT"
] as const;

export const offlineSyncStatuses = ["QUEUED", "SYNCED", "FAILED", "CONFLICT"] as const;

const deliveryDraftPayloadSchema = z.object({
  deliveryId: z.string().min(1, "Select a delivery."),
  serverUpdatedAt: z.string().datetime("Delivery snapshot is missing a valid server timestamp."),
  data: deliveryStatusSchema
});

const podDraftDataSchema = z.object({
  otp: z.string().trim().regex(/^[0-9]{4,8}$/, "OTP must be 4 to 8 digits.").optional().nullable(),
  signaturePlaceholder: z.string().trim().max(120, "Signature placeholder must be 120 characters or fewer.").optional().nullable(),
  photoPlaceholder: z.string().trim().max(120, "Photo placeholder must be 120 characters or fewer.").optional().nullable(),
  gpsLatitude: z.coerce.number().min(-90, "GPS latitude must be at least -90.").max(90, "GPS latitude cannot exceed 90.").optional().nullable(),
  gpsLongitude: z.coerce.number().min(-180, "GPS longitude must be at least -180.").max(180, "GPS longitude cannot exceed 180.").optional().nullable(),
  customerRemarks: z.string().trim().max(400, "Customer remarks must be 400 characters or fewer.").optional().nullable()
});

const podDraftPayloadSchema = z.object({
  deliveryId: z.string().min(1, "Select a delivery."),
  serverUpdatedAt: z.string().datetime("Proof draft is missing a valid server timestamp."),
  data: podDraftDataSchema
});

const snapshotPayloadSchema = z.object({
  capturedAt: z.string().datetime(),
  data: z.unknown()
});

export const offlineSyncItemSchema = z.object({
  clientId: z.string().min(6, "Sync item is missing a client id.").max(120, "Client id is too long."),
  type: z.enum(offlineSyncItemTypes),
  payload: z.unknown(),
  clientCreatedAt: z.string().datetime().optional().nullable()
}).superRefine((value, context) => {
  const checks = {
    ASSIGNED_DELIVERY_SNAPSHOT: snapshotPayloadSchema,
    VEHICLE_STOCK_SNAPSHOT: snapshotPayloadSchema,
    CUSTOMER_DRAFT: customerSchema,
    DELIVERY_STATUS_DRAFT: deliveryDraftPayloadSchema,
    PROOF_OF_DELIVERY_DRAFT: podDraftPayloadSchema,
    FIELD_SALE_DRAFT: fieldSaleSchema
  } satisfies Record<(typeof offlineSyncItemTypes)[number], z.ZodTypeAny>;

  const parsed = checks[value.type].safeParse(value.payload);
  if (!parsed.success) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["payload"],
      message: parsed.error.issues[0]?.message ?? "Offline draft payload is invalid."
    });
  }
});

export const offlineSyncBatchSchema = z.object({
  items: z.array(offlineSyncItemSchema).min(1, "Add at least one offline draft before syncing.").max(25, "Sync 25 offline items or fewer at a time.")
});

export type OfflineSyncItemInput = z.infer<typeof offlineSyncItemSchema>;
export type OfflineSyncItemTypeKey = (typeof offlineSyncItemTypes)[number];
export type OfflineSyncStatusKey = (typeof offlineSyncStatuses)[number];

export function canUseOfflineMode(role: AppRole) {
  return ["ADMIN", "WAREHOUSE_MANAGER", "PLANT_MANAGER", "MSO", "SERVICE_CENTRE_STAFF"].includes(role);
}

export function canReviewOfflineSync(role: AppRole) {
  return ["ADMIN", "WAREHOUSE_MANAGER", "PLANT_MANAGER"].includes(role);
}

export function formatOfflineSyncType(type: string) {
  return titleize(type);
}

export function formatOfflineSyncStatus(status: string) {
  return titleize(status);
}

export function offlineStorageKey(userId: string) {
  return `lpg-stage15-offline-${userId}`;
}

export function generateOfflineClientId(prefix = "offline") {
  const now = new Date();
  return `${prefix}-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
}

function titleize(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
