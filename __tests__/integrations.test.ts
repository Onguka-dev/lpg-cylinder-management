import { describe, expect, it } from "vitest";
import {
  barcodeScanSchema,
  canManageIntegrations,
  canTriggerIntegrations,
  canViewIntegrations,
  formatIntegrationProvider,
  gpsCaptureSchema,
  integrationLogSchema,
  integrationProviderTypes,
  mockIntegrationSend,
  seedIntegrationSettings
} from "@/lib/integrations";
import { sapDocumentPlaceholder, sapPostingStatuses, sapSourceModules } from "@/lib/sap-posting";

describe("integrations", () => {
  it("defines Stage 16 mock adapter types", () => {
    expect(integrationProviderTypes).toEqual([
      "SAP_ACCOUNTING",
      "PAYMENT_GATEWAY",
      "SMS_EMAIL",
      "BARCODE_RFID",
      "MAPS_GPS"
    ]);
    expect(seedIntegrationSettings).toHaveLength(5);
  });

  it("validates mock integration attempts", () => {
    expect(integrationLogSchema.safeParse({
      providerType: "SAP_ACCOUNTING",
      action: "POST_ACCOUNTING_DOCUMENT",
      relatedRecord: "INV-001",
      payload: { amount: 1200 }
    }).success).toBe(true);
  });

  it("validates scan and GPS placeholders clearly", () => {
    expect(barcodeScanSchema.safeParse({ scanValue: "RFID-001" }).success).toBe(true);
    expect(gpsCaptureSchema.safeParse({ latitude: -1.2921, longitude: 36.8219 }).success).toBe(true);
    expect(gpsCaptureSchema.safeParse({ latitude: -100, longitude: 36.8219 }).success).toBe(false);
  });

  it("simulates success and failure without live credentials", () => {
    expect(mockIntegrationSend({ payload: { reference: "OK" } }).ok).toBe(true);
    expect(mockIntegrationSend({ forceFailure: true }).ok).toBe(false);
    expect(mockIntegrationSend({ payload: { reference: "fail-me" } }).ok).toBe(false);
  });

  it("keeps integration permissions role based", () => {
    expect(canViewIntegrations("ADMIN")).toBe(true);
    expect(canViewIntegrations("AUDITOR")).toBe(true);
    expect(canTriggerIntegrations("WAREHOUSE_MANAGER")).toBe(true);
    expect(canTriggerIntegrations("AUDITOR")).toBe(false);
    expect(canManageIntegrations("WAREHOUSE_MANAGER")).toBe(false);
    expect(canManageIntegrations("ADMIN")).toBe(true);
  });

  it("formats provider labels", () => {
    expect(formatIntegrationProvider("SAP_ACCOUNTING")).toBe("Sap Accounting");
  });

  it("defines safe SAP mock queue statuses and document placeholders", () => {
    expect(sapPostingStatuses).toEqual(["QUEUED", "POSTED", "FAILED", "RETRY_QUEUED", "MISMATCHED"]);
    expect(sapSourceModules).toContain("FULL_CYLINDER_SALE");
    expect(sapDocumentPlaceholder("FULL_CYLINDER_SALE", "SALE/001")).toBe("MOCK-SAP-FULL_CYLINDER_SALE-SALE-001");
  });
});
