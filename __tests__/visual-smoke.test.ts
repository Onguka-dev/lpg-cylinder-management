import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { routePermissions } from "@/lib/rbac";

const root = process.cwd();

const visualRoutes = [
  { label: "login page", path: "app/login/page.tsx", markers: ["BrandHeader", "Sign in to", "Professional LPG control"] },
  { label: "dashboard", path: "app/page.tsx", markers: ["TaskAlertPanel", "RecentActivityFeed", "Wells Gas operations view"] },
  { label: "warehouse overview", path: "app/warehouse/page.tsx", markers: ["Wells Gas Warehouse Overview", "Zone A Incoming", "Stock Health"] },
  { label: "Zone A incoming", path: "app/warehouse/incoming/page.tsx", markers: ["Incoming Asset Receiving", "Zone A incoming form", "Workflow guardrails"] },
  { label: "retail POS", path: "app/retail-sales/page.tsx", markers: ["Retail Point Sales", "Quick actions", "Payment readiness"] },
  { label: "MSO mobile dashboard", path: "app/field-sales/page.tsx", markers: ["Wells Gas / Green Wells Energies", "Assigned vehicle inventory", "Offline Drafts"] },
  { label: "warehouse mobile dashboard", path: "app/warehouse/mobile/page.tsx", markers: ["Warehouse Mobile", "pending sync", "Return / incoming list"] },
  { label: "reports", path: "app/reports/page.tsx", markers: ["Reporting & Analytics Dashboards", "Exports", "CSV"] }
];

describe("client-ready visual smoke coverage", () => {
  it.each(visualRoutes)("$label includes branded presentation sections", ({ path, markers }) => {
    const source = readFileSync(join(root, path), "utf8");

    for (const marker of markers) {
      expect(source).toContain(marker);
    }
  });

  it("keeps role access mapped for presentation QA routes", () => {
    expect(routePermissions.ADMIN).toContain("*");
    expect(routePermissions.WAREHOUSE_MANAGER).toEqual(expect.arrayContaining(["/warehouse", "/reports", "/notifications"]));
    expect(routePermissions.RSO).toEqual(expect.arrayContaining(["/retail-sales", "/notifications", "/profile"]));
    expect(routePermissions.MSO).toEqual(expect.arrayContaining(["/field-sales", "/offline", "/profile"]));
    expect(routePermissions.AUDITOR).toEqual(expect.arrayContaining(["/reports", "/audit-logs"]));
  });

  it("has a QA screenshot folder and known limitations document", () => {
    expect(existsSync(join(root, "docs", "qa-screenshots"))).toBe(true);
    expect(existsSync(join(root, "docs", "known-limitations.md"))).toBe(true);
  });
});
