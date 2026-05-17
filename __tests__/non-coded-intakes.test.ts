import { describe, expect, it } from "vitest";
import {
  canCreateNonCodedCylinderIntake,
  canReviewNonCodedCylinderIntake,
  canViewNonCodedCylinderIntake,
  isNonCodedIntakeBlockedForSale,
  nonCodedCylinderIntakeSchema,
  nonCodedIntakeReviewSchema
} from "@/lib/non-coded-intakes";

describe("non-coded cylinder intake workflow rules", () => {
  it("requires a customer lookup and visible cylinder details", () => {
    expect(nonCodedCylinderIntakeSchema.safeParse({
      visibleSerialNumber: "NC-RETURN-001",
      cylinderSizeKg: 13,
      condition: "NON_CODED",
      customerQuery: "0712345678"
    }).success).toBe(true);

    expect(nonCodedCylinderIntakeSchema.safeParse({
      visibleSerialNumber: "NC-RETURN-001",
      cylinderSizeKg: 13,
      condition: "NON_CODED"
    }).success).toBe(false);
  });

  it("blocks unsupported cylinder sizes", () => {
    expect(nonCodedCylinderIntakeSchema.safeParse({
      customerQuery: "0712345678",
      visibleSerialNumber: "NC-RETURN-002",
      cylinderSizeKg: 10,
      condition: "GOOD"
    }).success).toBe(false);
  });

  it("requires barcode or QR details before tag approval", () => {
    expect(nonCodedIntakeReviewSchema.safeParse({ action: "TAG_AND_APPROVE", newBarcode: "TAG-001" }).success).toBe(true);
    expect(nonCodedIntakeReviewSchema.safeParse({ action: "TAG_AND_APPROVE" }).success).toBe(false);
    expect(nonCodedIntakeReviewSchema.safeParse({ action: "LINK_EXISTING", cylinderCode: "CYL-001" }).success).toBe(true);
  });

  it("keeps pending intake statuses blocked from sale", () => {
    expect(isNonCodedIntakeBlockedForSale("PENDING_REVIEW")).toBe(true);
    expect(isNonCodedIntakeBlockedForSale("TAGGING_PENDING")).toBe(true);
    expect(isNonCodedIntakeBlockedForSale("TAGGED_APPROVED")).toBe(false);
  });

  it("aligns create, review, and view role permissions", () => {
    expect(canCreateNonCodedCylinderIntake("RSO")).toBe(true);
    expect(canCreateNonCodedCylinderIntake("AUDITOR")).toBe(false);
    expect(canReviewNonCodedCylinderIntake("WAREHOUSE_MANAGER")).toBe(true);
    expect(canReviewNonCodedCylinderIntake("SERVICE_CENTRE_STAFF")).toBe(false);
    expect(canViewNonCodedCylinderIntake("AUDITOR")).toBe(true);
  });
});
