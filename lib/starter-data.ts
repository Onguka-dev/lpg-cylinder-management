import { lpgSkuSchema, locationSchema, roleSchema, sampleUserSchema } from "@/lib/validation";

export const starterRoles = [
  { name: "ADMIN", description: "System administration and organization-wide oversight" },
  { name: "WAREHOUSE_MANAGER", description: "Warehouse stock visibility and cylinder handling" },
  { name: "PLANT_MANAGER", description: "Refilling plant receipts, dispatch, safety, and stock controls" },
  { name: "RSO", description: "Regional sales operations placeholder role" },
  { name: "MSO", description: "Market sales operations placeholder role" },
  { name: "SERVICE_CENTRE_STAFF", description: "Service centre sales, receipts, returns, and customer support" },
  { name: "FINANCE_SAP_REVIEWER", description: "Finance, payment, SAP/accounting, and audit review" },
  { name: "AUDITOR", description: "Read-focused audit and compliance placeholder role" },
  { name: "CUSTOMER", description: "Customer self-service placeholder role" }
] as const;

export const starterLocations = [
  { code: "HQ", name: "Head Office", type: "HEAD_OFFICE" },
  { code: "WH-NBO", name: "Nairobi Main Warehouse", type: "WAREHOUSE" },
  { code: "DP-MBS", name: "Mombasa Depot", type: "DEPOT" },
  { code: "RO-KSM", name: "Kisumu Retail Outlet", type: "RETAIL_OUTLET" }
] as const;

export const starterUsers = [
  {
    name: "Admin Account",
    email: "admin@example.com",
    password: "password123",
    role: "ADMIN",
    locationCode: "HQ"
  },
  {
    name: "Warehouse Manager Account",
    email: "warehouse@example.com",
    password: "password123",
    role: "WAREHOUSE_MANAGER",
    locationCode: "WH-NBO"
  },
  {
    name: "Plant Manager Account",
    email: "plant@example.com",
    password: "password123",
    role: "PLANT_MANAGER",
    locationCode: "WH-NBO"
  },
  {
    name: "RSO Account",
    email: "rso@example.com",
    password: "password123",
    role: "RSO",
    locationCode: "DP-MBS"
  },
  {
    name: "MSO Account",
    email: "mso@example.com",
    password: "password123",
    role: "MSO",
    locationCode: "RO-KSM"
  },
  {
    name: "Service Centre Staff Account",
    email: "service@example.com",
    password: "password123",
    role: "SERVICE_CENTRE_STAFF",
    locationCode: "RO-KSM"
  },
  {
    name: "Finance/SAP Reviewer Account",
    email: "finance@example.com",
    password: "password123",
    role: "FINANCE_SAP_REVIEWER",
    locationCode: "HQ"
  },
  {
    name: "Auditor Account",
    email: "auditor@example.com",
    password: "password123",
    role: "AUDITOR",
    locationCode: "HQ"
  },
  {
    name: "Customer Account",
    email: "customer@example.com",
    password: "password123",
    role: "CUSTOMER",
    locationCode: "RO-KSM"
  }
] as const;

export const starterSkus = [
  { name: "6kg LPG Cylinder", capacityKg: 6, description: "Small household cylinder" },
  { name: "13kg LPG Cylinder", capacityKg: 13, description: "Standard household cylinder" },
  { name: "50kg LPG Cylinder", capacityKg: 50, description: "Commercial cylinder" }
] as const;

export function validateStarterData() {
  starterRoles.forEach((role) => roleSchema.parse(role));
  starterLocations.forEach((location) => locationSchema.parse(location));
  starterUsers.forEach((user) => sampleUserSchema.parse(user));
  starterSkus.forEach((sku) => lpgSkuSchema.parse(sku));

  return {
    roleCount: starterRoles.length,
    locationCount: starterLocations.length,
    userCount: starterUsers.length,
    skuCount: starterSkus.length
  };
}
