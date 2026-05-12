import { z } from "zod";
import type { AppRole } from "@/lib/auth-types";

export const sellingPointSourceCode = "WH-WANDIEGE-MAIN" as const;
export const westernSellingPointSourceCodes = [sellingPointSourceCode] as const;
export const nairobiSellingPointSourceCodes = ["WH-LAKE-GAS-NBO", "WH-OILCOM-NBO"] as const;
export const sellingPointSourceCodes = [...westernSellingPointSourceCodes, ...nairobiSellingPointSourceCodes] as const;

export const westernSellingPointDestinationCodes = [
  "WH-UGUNJA-SECONDARY",
  "VAN-KDK-152E",
  "VAN-KCX-301Q",
  "TUKTUK",
  "STN-MBITA",
  "STN-UGUNJA-A",
  "STN-UGUNJA-B",
  "STN-CBD",
  "STN-KSM-1",
  "SC-KIBUYE",
  "SC-POLYVIEW",
  "SC-MANYATTA",
  "SC-MIGOSI",
  "SC-KAKAMEGA"
] as const;

export const nairobiSellingPointDestinationCodes = [
  "SC-GARDEN-ESTATE",
  "SC-JOGOO-ROAD",
  "SC-NAIROBI-WEST",
  "SC-DAGORETTI",
  "SC-MLOLONGO"
] as const;

export const sellingPointDestinationCodes = [
  ...westernSellingPointDestinationCodes,
  ...nairobiSellingPointDestinationCodes
] as const;

export const sellingPointDistributionRoutes = [
  {
    key: "WESTERN",
    label: "Western Kenya",
    sourceCodes: westernSellingPointSourceCodes,
    destinationCodes: westernSellingPointDestinationCodes
  },
  {
    key: "NAIROBI",
    label: "Nairobi",
    sourceCodes: nairobiSellingPointSourceCodes,
    destinationCodes: nairobiSellingPointDestinationCodes
  }
] as const;

export type SellingPointDistributionRouteKey = (typeof sellingPointDistributionRoutes)[number]["key"];

export const sellingPointDispatchSchema = z.object({
  reference: z.string().trim().min(3, "Transfer number is required.").max(60),
  sourceLocationId: z.string().optional().nullable(),
  destinationLocationId: z.string().min(1, "Select a selling point destination."),
  cylinderCodes: z.array(z.string().trim().min(1)).min(1, "Scan at least one filled cylinder."),
  vehicle: z.string().trim().min(2, "Vehicle is required.").max(80),
  driverSalesRep: z.string().trim().min(2, "Driver or sales rep is required.").max(100),
  route: z.string().trim().min(2, "Route is required.").max(100),
  dispatchOfficerName: z.string().trim().min(2, "Dispatch officer is required.").max(100),
  receivingOfficerName: z.string().trim().min(2, "Receiving officer is required.").max(100),
  transferDateTime: z.string().min(1, "Transfer date/time is required."),
  expectedReceiptAt: z.string().optional().nullable(),
  remarks: z.string().trim().max(500).optional().nullable(),
  adminOverride: z.coerce.boolean().optional()
});

export const sellingPointReceiveSchema = z.object({
  receivedCodes: z.array(z.string().trim().min(1)).min(1, "Scan at least one cylinder at receipt."),
  receivingOfficerName: z.string().trim().max(100).optional().nullable(),
  remarks: z.string().trim().max(500).optional().nullable()
});

export type SellingPointDispatchInput = z.infer<typeof sellingPointDispatchSchema>;

export function canManageSellingPointDispatch(role: AppRole) {
  return role === "ADMIN" || role === "WAREHOUSE_MANAGER";
}

export function canReceiveSellingPointDispatch(role: AppRole) {
  return canManageSellingPointDispatch(role) || role === "RSO" || role === "MSO" || role === "SERVICE_CENTRE_STAFF";
}

export function canViewSellingPointDispatch(role: AppRole) {
  return canReceiveSellingPointDispatch(role) || role === "AUDITOR";
}

export function normalizeCylinderCode(code: string) {
  return code.trim().toUpperCase();
}

export function normalizeCodeList(codes: string[]) {
  return Array.from(new Set(codes.map(normalizeCylinderCode).filter(Boolean)));
}

export function findDuplicateCodes(codes: string[]) {
  const seen = new Set<string>();
  for (const code of codes.map(normalizeCylinderCode).filter(Boolean)) {
    if (seen.has(code)) return code;
    seen.add(code);
  }
  return null;
}

export function isWarehouseDestination(code: string) {
  return code === "WH-UGUNJA-SECONDARY";
}

export function getSellingPointRouteForSource(sourceCode: string) {
  return sellingPointDistributionRoutes.find((route) => route.sourceCodes.includes(sourceCode as never));
}

export function getSellingPointRouteForDestination(destinationCode: string) {
  return sellingPointDistributionRoutes.find((route) => route.destinationCodes.includes(destinationCode as never));
}

export function getSellingPointRouteForLocationCode(code: string) {
  return getSellingPointRouteForSource(code) ?? getSellingPointRouteForDestination(code);
}

export function sourceCanDispatchToDestination(sourceCode: string, destinationCode: string) {
  const sourceRoute = getSellingPointRouteForSource(sourceCode);
  return Boolean(sourceRoute?.destinationCodes.includes(destinationCode as never));
}

export function getDispatchableSourceStatuses(sourceCode: string, adminOverride?: boolean, userRole?: string | null) {
  if (adminOverride && userRole === "ADMIN") return ["FILLED_AT_WAREHOUSE", "FILLED"] as const;
  const route = getSellingPointRouteForSource(sourceCode);
  return route?.key === "NAIROBI" ? (["FILLED_AT_WAREHOUSE", "FILLED"] as const) : (["FILLED_AT_WAREHOUSE"] as const);
}

export function formatSellingPointLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
