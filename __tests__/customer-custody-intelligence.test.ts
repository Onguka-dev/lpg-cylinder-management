import { describe, expect, it } from "vitest";
import {
  canCreateRefillFollowUpReminders,
  canViewCustomerKyc,
  customerFrequencyLabel,
  expectedRefillFollowUpDate,
  followUpDaysForCylinderSize,
  isDueForRefillFollowUp,
  isOverdueCustody,
  normalizeCustomerCustodyFilter
} from "@/lib/customer-custody-intelligence";

describe("customer custody intelligence", () => {
  it("maps cylinder size to follow-up intervals", () => {
    expect(followUpDaysForCylinderSize(6)).toBe(21);
    expect(followUpDaysForCylinderSize(13)).toBe(30);
    expect(followUpDaysForCylinderSize(50)).toBe(45);
    expect(expectedRefillFollowUpDate(new Date("2026-05-01T00:00:00.000Z"), 13).toISOString().slice(0, 10)).toBe("2026-05-31");
  });

  it("classifies overdue and due-soon custody", () => {
    const now = new Date("2026-05-17T10:00:00.000Z");
    expect(isOverdueCustody({ expectedReturnFollowUpDate: new Date("2026-05-16T10:00:00.000Z") }, now)).toBe(true);
    expect(isDueForRefillFollowUp({ expectedReturnFollowUpDate: new Date("2026-05-22T10:00:00.000Z") }, now)).toBe(true);
    expect(isDueForRefillFollowUp({ returnDate: new Date(), expectedReturnFollowUpDate: new Date("2026-05-22T10:00:00.000Z") }, now)).toBe(false);
  });

  it("normalizes filters and frequency labels", () => {
    expect(normalizeCustomerCustodyFilter("HIGH_FREQUENCY")).toBe("HIGH_FREQUENCY");
    expect(normalizeCustomerCustodyFilter("NOPE")).toBe("ALL");
    expect(customerFrequencyLabel(6)).toBe("Very high");
    expect(customerFrequencyLabel(3)).toBe("High");
  });

  it("keeps KYC and reminder actions role-based", () => {
    expect(canViewCustomerKyc("AUDITOR")).toBe(true);
    expect(canViewCustomerKyc("CUSTOMER")).toBe(false);
    expect(canCreateRefillFollowUpReminders("MSO")).toBe(true);
    expect(canCreateRefillFollowUpReminders("AUDITOR")).toBe(false);
  });
});
