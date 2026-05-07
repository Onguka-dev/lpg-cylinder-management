import type { AppRole } from "@/lib/auth-types";

export const defaultRouteByRole: Record<AppRole, string> = {
  ADMIN: "/admin",
  WAREHOUSE_MANAGER: "/warehouse",
  RSO: "/rso",
  MSO: "/mso",
  AUDITOR: "/auditor",
  CUSTOMER: "/customer"
};

export const routePermissions: Record<AppRole, string[]> = {
  ADMIN: ["*"],
  WAREHOUSE_MANAGER: ["/", "/warehouse", "/inventory", "/transfers", "/orders", "/deliveries", "/payments", "/reports", "/notifications", "/reconciliations", "/safety", "/api/orders", "/api/deliveries", "/api/billing", "/api/reports", "/api/notifications", "/api/reconciliations", "/api/safety", "/api/cylinders", "/api/inventory"],
  RSO: ["/", "/rso", "/retail-sales", "/retail-inventory", "/customers", "/orders", "/payments", "/reports", "/reconciliations", "/inventory/movements", "/api/customers", "/api/orders", "/api/billing", "/api/reports", "/api/reconciliations", "/api/inventory/movements", "/api/retail"],
  MSO: ["/", "/mso", "/field-sales", "/deliveries", "/customers", "/orders", "/payments", "/reports", "/reconciliations", "/inventory/movements", "/api/customers", "/api/orders", "/api/deliveries", "/api/billing", "/api/reports", "/api/reconciliations", "/api/inventory/movements", "/api/field-sales"],
  AUDITOR: ["/", "/auditor", "/reports", "/notifications", "/audit-logs", "/customers", "/orders", "/payments", "/reconciliations", "/safety", "/api/orders", "/api/customers", "/api/billing", "/api/reports", "/api/notifications", "/api/reconciliations", "/api/safety", "/inventory", "/api/cylinders", "/api/inventory", "/retail-sales/refills", "/api/retail/refill-orders", "/api/retail/refill-stock", "/field-sales", "/api/field-sales", "/deliveries", "/api/deliveries"],
  CUSTOMER: ["/", "/customer"]
};

export function canAccessPath(role: AppRole, pathname: string) {
  const allowedPaths = routePermissions[role] ?? [];

  if (allowedPaths.includes("*")) {
    return true;
  }

  return allowedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function roleLabel(role: AppRole) {
  const labels: Record<AppRole, string> = {
    ADMIN: "Admin",
    WAREHOUSE_MANAGER: "Warehouse Manager",
    RSO: "RSO",
    MSO: "MSO",
    AUDITOR: "Auditor",
    CUSTOMER: "Customer"
  };

  return labels[role];
}
