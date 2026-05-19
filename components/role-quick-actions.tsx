import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Barcode,
  ClipboardCheck,
  Factory,
  FileSearch,
  PackagePlus,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Warehouse
} from "lucide-react";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import type { AppRole } from "@/lib/auth-types";

type QuickAction = {
  label: string;
  href: string;
  icon: typeof Barcode;
  tone?: "primary" | "default";
  roles: AppRole[];
};

const quickActions: QuickAction[] = [
  { label: "Receive Cylinders", href: "/inventory/supplier-receipts/new", icon: ArrowDownToLine, tone: "primary", roles: ["ADMIN", "WAREHOUSE_MANAGER"] },
  { label: "Dispatch Cylinders", href: "/inventory/selling-point-dispatches/new", icon: ArrowUpFromLine, roles: ["ADMIN", "WAREHOUSE_MANAGER"] },
  { label: "Plant Refill", href: "/inventory/plant-transfers", icon: Factory, roles: ["ADMIN", "WAREHOUSE_MANAGER", "PLANT_MANAGER"] },
  { label: "Mobile Scanner", href: "/warehouse/mobile/scan", icon: Barcode, tone: "primary", roles: ["ADMIN", "WAREHOUSE_MANAGER", "PLANT_MANAGER"] },
  { label: "Scan Sale", href: "/retail-sales/pos", icon: ReceiptText, tone: "primary", roles: ["ADMIN", "RSO", "MSO", "SERVICE_CENTRE_STAFF"] },
  { label: "Log Empty Return", href: "/retail-sales/empty-returns/new", icon: RefreshCw, roles: ["ADMIN", "RSO", "MSO", "SERVICE_CENTRE_STAFF"] },
  { label: "Non-Coded Return", href: "/retail-sales/empty-returns/new?mode=no-code", icon: PackagePlus, roles: ["ADMIN", "RSO", "MSO", "SERVICE_CENTRE_STAFF", "WAREHOUSE_MANAGER"] },
  { label: "Register Customer", href: "/customers/new", icon: UserPlus, roles: ["ADMIN", "RSO", "MSO", "SERVICE_CENTRE_STAFF"] },
  { label: "Stock Count", href: "/reconciliations/new", icon: ClipboardCheck, roles: ["ADMIN", "WAREHOUSE_MANAGER", "PLANT_MANAGER", "RSO", "MSO", "SERVICE_CENTRE_STAFF"] },
  { label: "Reports", href: "/reports", icon: BarChart3, roles: ["ADMIN", "WAREHOUSE_MANAGER", "PLANT_MANAGER", "RSO", "MSO", "SERVICE_CENTRE_STAFF", "FINANCE_SAP_REVIEWER", "AUDITOR"] },
  { label: "Audit Review", href: "/audit-logs", icon: FileSearch, roles: ["ADMIN", "AUDITOR", "FINANCE_SAP_REVIEWER"] },
  { label: "Admin Setup", href: "/admin/master-data", icon: ShieldCheck, roles: ["ADMIN"] },
  { label: "Warehouse Mobile", href: "/warehouse/mobile", icon: Warehouse, roles: ["ADMIN", "WAREHOUSE_MANAGER"] }
];

export function RoleQuickActions({ role }: { role: AppRole }) {
  const visibleActions = quickActions.filter((action) => action.roles.includes(role));

  return (
    <SectionCard title="Role quick actions" description="Fast entry points matched to the signed-in role and existing Wells Gas workflows.">
      {visibleActions.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {visibleActions.map((action) => {
            const Icon = action.icon;
            const isPrimary = action.tone === "primary";

            return (
              <Link
                aria-label={action.label}
                className={isPrimary
                  ? "flex min-h-24 flex-col justify-between rounded-brand bg-brand-600 p-4 text-white shadow-panel outline-none ring-brand-200 transition focus:ring-2"
                  : "flex min-h-24 flex-col justify-between rounded-brand border border-slate-200 bg-slate-50 p-4 text-slate-800 shadow-sm outline-none ring-brand-200 transition hover:border-brand-200 focus:ring-2"}
                href={action.href}
                key={`${role}-${action.href}-${action.label}`}
              >
                <Icon size={22} aria-hidden="true" />
                <span className="mt-3 text-sm font-bold leading-5">{action.label}</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-brand border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          No quick actions are configured for this role.
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge tone="success">Desktop ready</StatusBadge>
        <StatusBadge tone="brand">Mobile touch targets</StatusBadge>
      </div>
    </SectionCard>
  );
}
