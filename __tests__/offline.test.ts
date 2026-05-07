import { describe, expect, it } from "vitest";
import {
  canReviewOfflineSync,
  canUseOfflineMode,
  formatOfflineSyncStatus,
  generateOfflineClientId,
  offlineStorageKey,
  offlineSyncBatchSchema,
  offlineSyncItemTypes
} from "@/lib/offline";

describe("offline mode", () => {
  it("defines the Stage 15 offline draft types", () => {
    expect(offlineSyncItemTypes).toEqual([
      "ASSIGNED_DELIVERY_SNAPSHOT",
      "VEHICLE_STOCK_SNAPSHOT",
      "CUSTOMER_DRAFT",
      "DELIVERY_STATUS_DRAFT",
      "PROOF_OF_DELIVERY_DRAFT",
      "FIELD_SALE_DRAFT"
    ]);
  });

  it("validates customer drafts in the sync queue", () => {
    const parsed = offlineSyncBatchSchema.safeParse({
      items: [{
        clientId: "customer-draft-001",
        type: "CUSTOMER_DRAFT",
        clientCreatedAt: new Date().toISOString(),
        payload: {
          name: "Offline Customer",
          phone: "+254700150001",
          proofReference: "OFF-ID-001",
          category: "DOMESTIC",
          address: "Offline route address",
          status: "ACTIVE"
        }
      }]
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid delivery proof drafts with clear validation", () => {
    const parsed = offlineSyncBatchSchema.safeParse({
      items: [{
        clientId: "pod-draft-001",
        type: "PROOF_OF_DELIVERY_DRAFT",
        payload: {
          deliveryId: "delivery-1",
          serverUpdatedAt: new Date().toISOString(),
          data: { otp: "12" }
        }
      }]
    });
    expect(parsed.success).toBe(false);
  });

  it("keeps offline permissions limited to operational users", () => {
    expect(canUseOfflineMode("ADMIN")).toBe(true);
    expect(canUseOfflineMode("WAREHOUSE_MANAGER")).toBe(true);
    expect(canUseOfflineMode("MSO")).toBe(true);
    expect(canUseOfflineMode("AUDITOR")).toBe(false);
    expect(canReviewOfflineSync("WAREHOUSE_MANAGER")).toBe(true);
    expect(canReviewOfflineSync("MSO")).toBe(false);
  });

  it("creates stable local storage keys and client ids", () => {
    expect(offlineStorageKey("user-1")).toBe("lpg-stage15-offline-user-1");
    expect(generateOfflineClientId("test")).toContain("test-");
    expect(formatOfflineSyncStatus("CONFLICT")).toBe("Conflict");
  });
});
