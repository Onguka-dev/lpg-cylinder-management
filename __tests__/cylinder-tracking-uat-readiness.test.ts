import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = process.cwd();

const readProjectFile = (path: string) => readFileSync(join(rootDir, path), "utf8");

describe("Prompt 17 cylinder tracking UAT readiness", () => {
  it("documents the complete UAT movement cycle", () => {
    const uat = readProjectFile("docs/uat-cylinder-tracking.md");

    [
      "Supplier Receipt Into Warehouse",
      "Duplicate Barcode and Serial Validation",
      "Warehouse To Plant Empty Transfer",
      "Plant Receipt, Variance, and Refill Return",
      "Dispatch Filled Cylinders To Selling Point",
      "Nairobi Warehouse Distribution",
      "Customer Registration and Full Cylinder Sale",
      "Refill Exchange With Returned Empty",
      "Non-Coded Return",
      "Empty Reverse Logistics",
      "Damaged or Leaking Return",
      "Reports and CSV Export",
      "Daily Reconciliation With Deliberate Variance",
      "Role Permission Negative Tests"
    ].forEach((scenario) => {
      expect(uat).toContain(scenario);
    });
  });

  it("documents remaining production placeholders for cylinder tracking", () => {
    const limitations = readProjectFile("docs/cylinder-tracking-known-limitations.md").toLowerCase();

    ["camera scanning", "sap posting", "sms", "excel", "pdf", "demo users"].forEach((topic) => {
      expect(limitations).toContain(topic);
    });
  });

  it("keeps the production readiness checklist focused on final controls", () => {
    const checklist = readProjectFile("docs/production-readiness-checklist.md").toLowerCase();

    [
      "data privacy",
      "backups",
      "role permissions",
      "audit logs",
      "export tests",
      "deployment environment variables"
    ].forEach((item) => {
      expect(checklist).toContain(item);
    });
  });

  it("keeps seed data ready for a full cylinder tracking demo", () => {
    const seed = readProjectFile("prisma/seed.ts");

    [
      "CYL-6KG",
      "CYL-13KG",
      "CYL-50KG",
      "admin@example.com",
      "warehouse@example.com",
      "plant@example.com",
      "rso@example.com",
      "mso@example.com",
      "service@example.com",
      "auditor@example.com",
      "Wandiege Main Warehouse",
      "Sabuni Road Refilling Plant",
      "TRF-STAGE5-SEED",
      "REC-STAGE11-WH-SEED"
    ].forEach((fixture) => {
      expect(seed).toContain(fixture);
    });
  });

  it("keeps automated coverage anchored to critical cylinder workflows", () => {
    const testFiles = [
      "__tests__/supplier-receipts.test.ts",
      "__tests__/plant-refill-workflow.test.ts",
      "__tests__/selling-point-distribution.test.ts",
      "__tests__/full-cylinder-sales.test.ts",
      "__tests__/refill-sales.test.ts",
      "__tests__/reverse-logistics.test.ts",
      "__tests__/non-coded-intakes.test.ts",
      "__tests__/reports.test.ts",
      "__tests__/reconciliations.test.ts"
    ];

    testFiles.forEach((file) => {
      expect(readProjectFile(file).trim().length).toBeGreaterThan(200);
    });
  });
});
