import { z } from "zod";
import type { AppRole } from "@/lib/auth-types";

export const integrationProviderTypes = [
  "SAP_ACCOUNTING",
  "PAYMENT_GATEWAY",
  "SMS_EMAIL",
  "BARCODE_RFID",
  "MAPS_GPS"
] as const;

export const integrationLogStatuses = ["QUEUED", "SUCCESS", "FAILED", "RETRY_QUEUED"] as const;

export const integrationActions = [
  "POST_ACCOUNTING_DOCUMENT",
  "PAYMENT_CALLBACK",
  "SEND_NOTIFICATION",
  "SCAN_BARCODE_RFID",
  "CAPTURE_GPS_POINT"
] as const;

export const integrationSettingSchema = z.object({
  providerType: z.enum(integrationProviderTypes),
  name: z.string().trim().min(2, "Integration name must be at least 2 characters.").max(120, "Integration name must be 120 characters or fewer."),
  isEnabled: z.coerce.boolean().default(true),
  endpointPlaceholder: z.string().trim().max(200, "Endpoint placeholder must be 200 characters or fewer.").optional().nullable(),
  credentialPlaceholder: z.string().trim().max(160, "Credential placeholder must be 160 characters or fewer.").optional().nullable(),
  mockFailureRate: z.coerce.number().int().min(0, "Mock failure rate cannot be negative.").max(100, "Mock failure rate cannot exceed 100.").default(0),
  notes: z.string().trim().max(400, "Notes must be 400 characters or fewer.").optional().nullable()
});

export const integrationLogSchema = z.object({
  providerType: z.enum(integrationProviderTypes),
  action: z.enum(integrationActions),
  relatedRecord: z.string().trim().max(120, "Related record must be 120 characters or fewer.").optional().nullable(),
  payload: z.record(z.unknown()).optional().nullable(),
  forceFailure: z.coerce.boolean().optional()
});

export const barcodeScanSchema = z.object({
  scanValue: z.string().trim().min(3, "Enter a barcode or RFID value.").max(120, "Barcode/RFID value must be 120 characters or fewer."),
  relatedRecord: z.string().trim().max(120, "Related record must be 120 characters or fewer.").optional().nullable(),
  notes: z.string().trim().max(240, "Notes must be 240 characters or fewer.").optional().nullable()
});

export const gpsCaptureSchema = z.object({
  latitude: z.coerce.number().min(-90, "GPS latitude must be at least -90.").max(90, "GPS latitude cannot exceed 90."),
  longitude: z.coerce.number().min(-180, "GPS longitude must be at least -180.").max(180, "GPS longitude cannot exceed 180."),
  relatedRecord: z.string().trim().max(120, "Related record must be 120 characters or fewer.").optional().nullable(),
  notes: z.string().trim().max(240, "Notes must be 240 characters or fewer.").optional().nullable()
});

export const seedIntegrationSettings = [
  { providerType: "SAP_ACCOUNTING", name: "SAP/accounting mock posting", endpointPlaceholder: "https://sap.example.local/mock-posting", credentialPlaceholder: "SAP credential placeholder", mockFailureRate: 0, notes: "Posts invoices and receipts to accounting in mock mode." },
  { providerType: "PAYMENT_GATEWAY", name: "Payment gateway mock callbacks", endpointPlaceholder: "https://payments.example.local/mock-callback", credentialPlaceholder: "Mpesa/card callback secret placeholder", mockFailureRate: 0, notes: "Receives Mpesa, card, and online payment callback placeholders." },
  { providerType: "SMS_EMAIL", name: "SMS/email provider mock", endpointPlaceholder: "https://notify.example.local/mock-send", credentialPlaceholder: "SMS/email API key placeholder", mockFailureRate: 0, notes: "Simulates SMS and email provider delivery." },
  { providerType: "BARCODE_RFID", name: "Barcode/RFID scan input", endpointPlaceholder: "scanner://mock-input", credentialPlaceholder: "Scanner credential placeholder", mockFailureRate: 0, notes: "Captures barcode and RFID scan text without hardware credentials." },
  { providerType: "MAPS_GPS", name: "Maps/GPS provider placeholder", endpointPlaceholder: "https://maps.example.local/mock-geocode", credentialPlaceholder: "Maps API key placeholder", mockFailureRate: 0, notes: "Stores GPS coordinates and route map placeholders." }
] as const;

export function canViewIntegrations(role: AppRole) {
  return ["ADMIN", "WAREHOUSE_MANAGER", "AUDITOR"].includes(role);
}

export function canManageIntegrations(role: AppRole) {
  return role === "ADMIN";
}

export function canTriggerIntegrations(role: AppRole) {
  return ["ADMIN", "WAREHOUSE_MANAGER"].includes(role);
}

export function formatIntegrationProvider(providerType: string) {
  return titleize(providerType);
}

export function formatIntegrationStatus(status: string) {
  return titleize(status);
}

export function generateIntegrationReference() {
  const now = new Date();
  return `INT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}${String(now.getMilliseconds()).padStart(3, "0")}`;
}

export function mockIntegrationSend(input: { forceFailure?: boolean; mockFailureRate?: number; payload?: unknown }) {
  if (input.forceFailure) {
    return { ok: false, errorMessage: "Mock integration failure requested for retry testing." };
  }

  const serialized = JSON.stringify(input.payload ?? {}).toLowerCase();
  if (serialized.includes("fail")) {
    return { ok: false, errorMessage: "Mock integration failed because payload contains 'fail'." };
  }

  const failureRate = input.mockFailureRate ?? 0;
  if (failureRate >= 100) {
    return { ok: false, errorMessage: "Mock integration failed because failure rate is 100%." };
  }

  return { ok: true, response: { mock: true, acceptedAt: new Date().toISOString() } };
}

function titleize(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
