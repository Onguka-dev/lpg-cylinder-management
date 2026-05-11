import { z } from "zod";
import { CylinderStatus, ScanActionType, ScanResultStatus, type PrismaClient } from "@prisma/client";
import { cylinderSaleBlockedReason } from "@/lib/safety";

export const scanActionTypes = [
  "RECEIPT",
  "TRANSFER_DISPATCH",
  "TRANSFER_RECEIVE",
  "SALE",
  "CUSTOMER_RETURN",
  "NON_CODED_INTAKE",
  "REPORT_LOOKUP",
  "MOBILE_VERIFY"
] as const;

export const scanResultStatuses = [
  "PERMITTED",
  "CYLINDER_NOT_FOUND",
  "WRONG_LOCATION",
  "WRONG_STATUS",
  "BLOCKED_DAMAGED",
  "ALREADY_SCANNED",
  "INACTIVE",
  "FAILED"
] as const;

export const scannerValidationSchema = z.object({
  barcode: z.string().trim().min(1, "Scan or type a barcode, QR code, factory serial, or cylinder serial number."),
  action: z.enum(scanActionTypes),
  expectedSourceLocationId: z.string().trim().optional().nullable(),
  expectedStatus: z.nativeEnum(CylinderStatus).optional().nullable(),
  scannedLocationId: z.string().trim().optional().nullable(),
  batchId: z.string().trim().max(120).optional().nullable(),
  batchBarcodeValues: z.array(z.string().trim()).optional().default([]),
  allowDuplicateInBatch: z.boolean().optional().default(false)
});

export type ScannerValidationInput = z.input<typeof scannerValidationSchema>;
type ParsedScannerValidationInput = z.output<typeof scannerValidationSchema>;

export type ScannerValidationResponse = {
  ok: boolean;
  result: ScanResultStatus;
  message: string;
  cylinder?: {
    id: string;
    serialNumber: string;
    barcode: string | null;
    factorySerialNo: string | null;
    qrCode: string | null;
    status: CylinderStatus;
    activeStatus: boolean;
    blockedReason: string | null;
    skuName: string;
    locationId: string;
    locationName: string;
  };
};

type PrismaScanClient = Pick<PrismaClient, "cylinder" | "scanEvent">;

export function normalizeScanValue(value: string) {
  return value.trim().toUpperCase();
}

export function isDuplicateInBatch(barcode: string, batchBarcodeValues: string[] = []) {
  const normalized = normalizeScanValue(barcode);
  return batchBarcodeValues.map(normalizeScanValue).includes(normalized);
}

export function scanResultMessage(result: ScanResultStatus, detail?: string | null) {
  if (detail) return detail;

  switch (result) {
    case "PERMITTED":
      return "Cylinder permitted for this scan.";
    case "CYLINDER_NOT_FOUND":
      return "Cylinder not found.";
    case "WRONG_LOCATION":
      return "Cylinder is in the wrong location for this action.";
    case "WRONG_STATUS":
      return "Cylinder has the wrong status for this action.";
    case "BLOCKED_DAMAGED":
      return "Cylinder is blocked, damaged, quarantined, or unsafe.";
    case "ALREADY_SCANNED":
      return "Cylinder already scanned in this batch.";
    case "INACTIVE":
      return "Cylinder is inactive.";
    case "FAILED":
    default:
      return "Scan failed validation.";
  }
}

export async function validateAndLogCylinderScan(
  db: PrismaScanClient,
  input: ScannerValidationInput,
  userId?: string | null
): Promise<ScannerValidationResponse> {
  const parsed = scannerValidationSchema.parse(input);
  const barcode = normalizeScanValue(parsed.barcode);
  let response: ScannerValidationResponse;

  if (!parsed.allowDuplicateInBatch && isDuplicateInBatch(barcode, parsed.batchBarcodeValues)) {
    response = {
      ok: false,
      result: "ALREADY_SCANNED",
      message: scanResultMessage("ALREADY_SCANNED")
    };
    await logScanEvent(db, parsed, response, barcode, userId);
    return response;
  }

  const cylinder = await db.cylinder.findFirst({
    where: {
      OR: [
        { barcode: { equals: barcode, mode: "insensitive" } },
        { qrCode: { equals: barcode, mode: "insensitive" } },
        { serialNumber: { equals: barcode, mode: "insensitive" } },
        { factorySerialNo: { equals: barcode, mode: "insensitive" } }
      ]
    },
    include: { sku: true, currentLocation: true }
  });

  if (!cylinder) {
    response = {
      ok: false,
      result: "CYLINDER_NOT_FOUND",
      message: scanResultMessage("CYLINDER_NOT_FOUND")
    };
    await logScanEvent(db, parsed, response, barcode, userId);
    return response;
  }

  const cylinderSummary = {
    id: cylinder.id,
    serialNumber: cylinder.serialNumber,
    barcode: cylinder.barcode,
    factorySerialNo: cylinder.factorySerialNo,
    qrCode: cylinder.qrCode,
    status: cylinder.status,
    activeStatus: cylinder.activeStatus,
    blockedReason: cylinder.blockedReason,
    skuName: cylinder.sku.name,
    locationId: cylinder.currentLocationId,
    locationName: cylinder.currentLocation.name
  };

  if (!cylinder.activeStatus) {
    response = {
      ok: false,
      result: "INACTIVE",
      message: scanResultMessage("INACTIVE"),
      cylinder: cylinderSummary
    };
  } else if (parsed.expectedSourceLocationId && cylinder.currentLocationId !== parsed.expectedSourceLocationId) {
    response = {
      ok: false,
      result: "WRONG_LOCATION",
      message: `Wrong location: expected selected source location, found ${cylinder.currentLocation.name}.`,
      cylinder: cylinderSummary
    };
  } else if (parsed.expectedStatus && cylinder.status !== parsed.expectedStatus) {
    response = {
      ok: false,
      result: "WRONG_STATUS",
      message: `Wrong status: expected ${formatScanLabel(parsed.expectedStatus)}, found ${formatScanLabel(cylinder.status)}.`,
      cylinder: cylinderSummary
    };
  } else {
    const blockedReason = cylinderSaleBlockedReason(cylinder);
    if (blockedReason) {
      response = {
        ok: false,
        result: "BLOCKED_DAMAGED",
        message: cylinder.blockedReason ?? blockedReason,
        cylinder: cylinderSummary
      };
    } else {
      response = {
        ok: true,
        result: "PERMITTED",
        message: scanResultMessage("PERMITTED"),
        cylinder: cylinderSummary
      };
    }
  }

  await logScanEvent(db, parsed, response, barcode, userId);
  return response;
}

export function formatScanLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function logScanEvent(
  db: PrismaScanClient,
  input: ParsedScannerValidationInput,
  response: ScannerValidationResponse,
  barcode: string,
  userId?: string | null
) {
  await db.scanEvent.create({
    data: {
      barcode,
      action: input.action as ScanActionType,
      result: response.result,
      failureReason: response.ok ? null : response.message,
      batchId: input.batchId || null,
      expectedStatus: input.expectedStatus ?? null,
      scannedStatus: response.cylinder?.status ?? null,
      expectedLocationId: input.expectedSourceLocationId || null,
      scannedLocationId: response.cylinder?.locationId ?? input.scannedLocationId ?? null,
      cylinderId: response.cylinder?.id ?? null,
      userId: userId || null,
      metadata: {
        allowDuplicateInBatch: Boolean(input.allowDuplicateInBatch),
        suppliedBatchCount: input.batchBarcodeValues?.length ?? 0
      }
    }
  });
}
