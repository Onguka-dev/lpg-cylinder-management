import type { AppRole } from "@/lib/auth-types";

export const defaultRouteByRole: Record<AppRole, string> = {
  ADMIN: "/admin",
  WAREHOUSE_MANAGER: "/warehouse",
  PLANT_MANAGER: "/warehouse",
  RSO: "/rso",
  MSO: "/mso",
  SERVICE_CENTRE_STAFF: "/retail-sales",
  FINANCE_SAP_REVIEWER: "/payments",
  AUDITOR: "/auditor",
  CUSTOMER: "/customer"
};

export const routePermissions: Record<AppRole, string[]> = {
  ADMIN: ["*"],
  WAREHOUSE_MANAGER: ["/", "/profile", "/warehouse", "/inventory", "/transfers", "/orders", "/deliveries", "/offline", "/payments", "/reports", "/integrations", "/notifications", "/reconciliations", "/safety", "/api/orders", "/api/deliveries", "/api/offline", "/api/billing", "/api/reports", "/api/integrations", "/api/notifications", "/api/reconciliations", "/api/safety", "/api/cylinders", "/api/inventory"],
  PLANT_MANAGER: ["/", "/profile", "/warehouse", "/inventory", "/transfers", "/deliveries", "/reports", "/notifications", "/reconciliations", "/safety", "/api/deliveries", "/api/reports", "/api/notifications", "/api/reconciliations", "/api/safety", "/api/cylinders", "/api/inventory"],
  RSO: ["/", "/profile", "/rso", "/retail-sales", "/retail-inventory", "/customers", "/orders", "/payments", "/reports", "/notifications", "/reconciliations", "/inventory/movements", "/inventory/selling-point-dispatches", "/api/customers", "/api/customer-complaints", "/api/orders", "/api/billing", "/api/reports", "/api/notifications", "/api/reconciliations", "/api/inventory/movements", "/api/inventory/selling-point-dispatches", "/api/retail"],
  MSO: ["/", "/profile", "/mso", "/field-sales", "/deliveries", "/offline", "/customers", "/orders", "/payments", "/reports", "/notifications", "/reconciliations", "/inventory/movements", "/inventory/selling-point-dispatches", "/api/customers", "/api/customer-complaints", "/api/orders", "/api/deliveries", "/api/offline", "/api/billing", "/api/reports", "/api/notifications", "/api/reconciliations", "/api/inventory/movements", "/api/inventory/selling-point-dispatches", "/api/field-sales"],
  SERVICE_CENTRE_STAFF: ["/", "/profile", "/retail-sales", "/retail-inventory", "/customers", "/orders", "/payments", "/reports", "/notifications", "/inventory/movements", "/inventory/selling-point-dispatches", "/api/customers", "/api/customer-complaints", "/api/orders", "/api/billing", "/api/reports", "/api/notifications", "/api/inventory/movements", "/api/inventory/selling-point-dispatches", "/api/retail"],
  FINANCE_SAP_REVIEWER: ["/", "/profile", "/payments", "/reports", "/integrations", "/notifications", "/audit-logs", "/api/billing", "/api/reports", "/api/integrations/logs", "/api/notifications", "/api/audit-logs"],
  AUDITOR: ["/", "/profile", "/auditor", "/reports", "/integrations", "/notifications", "/audit-logs", "/settings/security", "/customers", "/orders", "/payments", "/reconciliations", "/safety", "/api/audit-logs", "/api/security/settings", "/api/security/sessions", "/api/orders", "/api/customers", "/api/customer-complaints", "/api/billing", "/api/reports", "/api/integrations/logs", "/api/integrations/settings", "/api/notifications", "/api/reconciliations", "/api/safety", "/inventory", "/api/cylinders", "/api/inventory", "/retail-sales/refills", "/api/retail/refill-orders", "/api/retail/refill-stock", "/field-sales", "/api/field-sales", "/deliveries", "/api/deliveries"],
  CUSTOMER: ["/", "/profile", "/customer"]
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
    PLANT_MANAGER: "Plant Manager",
    RSO: "RSO",
    MSO: "MSO",
    SERVICE_CENTRE_STAFF: "Service Centre Staff",
    FINANCE_SAP_REVIEWER: "Finance/SAP Reviewer",
    AUDITOR: "Auditor",
    CUSTOMER: "Customer"
  };

  return labels[role];
}
