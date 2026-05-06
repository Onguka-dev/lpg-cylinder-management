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
  WAREHOUSE_MANAGER: ["/", "/warehouse", "/inventory", "/transfers", "/orders", "/api/orders", "/api/cylinders", "/api/inventory"],
  RSO: ["/", "/rso", "/retail-sales", "/retail-inventory", "/customers", "/orders", "/inventory/movements", "/api/customers", "/api/orders", "/api/inventory/movements", "/api/retail"],
  MSO: ["/", "/mso", "/field-sales", "/deliveries", "/customers", "/orders", "/inventory/movements", "/api/customers", "/api/orders", "/api/inventory/movements"],
  AUDITOR: ["/", "/auditor", "/reports", "/audit-logs", "/customers", "/orders", "/api/orders", "/api/customers", "/inventory", "/api/cylinders", "/api/inventory", "/retail-sales/refills", "/api/retail/refill-orders", "/api/retail/refill-stock"],
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
