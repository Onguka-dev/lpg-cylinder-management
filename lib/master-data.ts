import { z } from "zod";
import type { Prisma } from "@prisma/client";

export const masterDataTypes = [
  "SKU_MASTER",
  "CYLINDER_SIZE",
  "CYLINDER_CATEGORY",
  "PRICE",
  "TAX",
  "DISCOUNT_PROMOTION",
  "DELIVERY_FEE",
  "REGION",
  "ZONE",
  "ROUTE",
  "LOCATION",
  "WAREHOUSE",
  "RETAIL_OUTLET",
  "VEHICLE",
  "MAINTENANCE_LOCATION",
  "DAMAGED_QUARANTINE_LOCATION",
  "STOCK_THRESHOLD"
] as const;

export type MasterDataTypeKey = (typeof masterDataTypes)[number];

export type MasterDataField =
  | "description"
  | "amount"
  | "rate"
  | "capacityKg"
  | "threshold"
  | "parentId";

export type MasterDataConfig = {
  type: MasterDataTypeKey;
  label: string;
  pluralLabel: string;
  description: string;
  fields: MasterDataField[];
  parentTypes?: MasterDataTypeKey[];
};

export const masterDataConfigs: MasterDataConfig[] = [
  {
    type: "SKU_MASTER",
    label: "SKU",
    pluralLabel: "SKU Master",
    description: "Selectable LPG product SKUs for later sales and inventory modules.",
    fields: ["description", "capacityKg", "parentId"],
    parentTypes: ["CYLINDER_SIZE", "CYLINDER_CATEGORY"]
  },
  {
    type: "CYLINDER_SIZE",
    label: "Cylinder Size",
    pluralLabel: "Cylinder Sizes",
    description: "Cylinder capacity definitions such as 6kg, 13kg, and 50kg.",
    fields: ["description", "capacityKg"]
  },
  {
    type: "CYLINDER_CATEGORY",
    label: "Cylinder Category",
    pluralLabel: "Cylinder Categories",
    description: "Reusable category labels for household and commercial cylinders.",
    fields: ["description"]
  },
  {
    type: "PRICE",
    label: "Price",
    pluralLabel: "Prices",
    description: "Price configuration placeholders for later sales screens.",
    fields: ["description", "amount", "parentId"],
    parentTypes: ["SKU_MASTER"]
  },
  {
    type: "TAX",
    label: "Tax",
    pluralLabel: "Taxes",
    description: "Tax rates that later modules can select during pricing.",
    fields: ["description", "rate"]
  },
  {
    type: "DISCOUNT_PROMOTION",
    label: "Discount/Promotion",
    pluralLabel: "Discounts & Promotions",
    description: "Promotion placeholders without sales workflow behavior.",
    fields: ["description", "rate"]
  },
  {
    type: "DELIVERY_FEE",
    label: "Delivery Fee",
    pluralLabel: "Delivery Fees",
    description: "Delivery fee settings for later delivery/order modules.",
    fields: ["description", "amount", "parentId"],
    parentTypes: ["ZONE", "REGION"]
  },
  {
    type: "REGION",
    label: "Region",
    pluralLabel: "Regions",
    description: "Regional operating areas.",
    fields: ["description"]
  },
  {
    type: "ZONE",
    label: "Zone",
    pluralLabel: "Zones",
    description: "Zones nested under regions.",
    fields: ["description", "parentId"],
    parentTypes: ["REGION"]
  },
  {
    type: "ROUTE",
    label: "Route",
    pluralLabel: "Route Placeholders",
    description: "Route placeholders for later dispatch planning.",
    fields: ["description", "parentId"],
    parentTypes: ["ZONE"]
  },
  {
    type: "LOCATION",
    label: "Location",
    pluralLabel: "Locations",
    description: "General operating locations selectable by later modules.",
    fields: ["description", "parentId"],
    parentTypes: ["ZONE", "REGION"]
  },
  {
    type: "WAREHOUSE",
    label: "Warehouse",
    pluralLabel: "Warehouses",
    description: "Warehouse master records.",
    fields: ["description", "parentId"],
    parentTypes: ["LOCATION", "ZONE"]
  },
  {
    type: "RETAIL_OUTLET",
    label: "Retail Outlet",
    pluralLabel: "Retail Outlets",
    description: "Retail outlet master records.",
    fields: ["description", "parentId"],
    parentTypes: ["LOCATION", "ZONE"]
  },
  {
    type: "VEHICLE",
    label: "Vehicle",
    pluralLabel: "Vehicles",
    description: "Vehicle records for later delivery assignment.",
    fields: ["description"]
  },
  {
    type: "MAINTENANCE_LOCATION",
    label: "Maintenance Location",
    pluralLabel: "Maintenance Locations",
    description: "Locations used to isolate cylinders for maintenance.",
    fields: ["description"]
  },
  {
    type: "DAMAGED_QUARANTINE_LOCATION",
    label: "Damaged Quarantine Location",
    pluralLabel: "Damaged Quarantine Locations",
    description: "Locations used to hold damaged cylinders away from usable stock.",
    fields: ["description"]
  },
  {
    type: "STOCK_THRESHOLD",
    label: "Stock Threshold",
    pluralLabel: "Stock Thresholds",
    description: "Minimum stock settings for later inventory alerts.",
    fields: ["description", "threshold", "parentId"],
    parentTypes: ["SKU_MASTER", "WAREHOUSE", "RETAIL_OUTLET"]
  }
];

export const masterDataTypeSchema = z.enum(masterDataTypes);

export const masterDataRecordSchema = z.object({
  type: masterDataTypeSchema,
  code: z
    .string()
    .trim()
    .min(2, "Code must be at least 2 characters.")
    .max(32, "Code must be 32 characters or fewer.")
    .regex(/^[A-Z0-9-]+$/i, "Code can only use letters, numbers, and hyphens."),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be 80 characters or fewer."),
  description: z.string().trim().max(240, "Description must be 240 characters or fewer.").optional(),
  amount: z.coerce.number().nonnegative("Amount cannot be negative.").optional().nullable(),
  rate: z.coerce.number().min(0, "Rate cannot be negative.").max(100, "Rate cannot exceed 100.").optional().nullable(),
  capacityKg: z.coerce.number().int().positive("Capacity must be a positive whole number.").optional().nullable(),
  threshold: z.coerce.number().int().nonnegative("Threshold cannot be negative.").optional().nullable(),
  parentId: z.string().trim().optional().nullable(),
  isActive: z.coerce.boolean().optional()
});

export type MasterDataFormValues = z.infer<typeof masterDataRecordSchema>;
export type SeedMasterDataRecord = MasterDataFormValues & {
  parentCode?: string;
  parentType?: MasterDataTypeKey;
  metadata?: Prisma.InputJsonValue;
};

export function getMasterDataConfig(type: string) {
  return masterDataConfigs.find((config) => config.type === type);
}

export function toSlug(type: MasterDataTypeKey) {
  return type.toLowerCase().replaceAll("_", "-");
}

export function fromSlug(slug: string) {
  const type = slug.toUpperCase().replaceAll("-", "_");

  return masterDataTypeSchema.safeParse(type).success ? (type as MasterDataTypeKey) : null;
}

export const seedMasterDataRecords: SeedMasterDataRecord[] = [
  { type: "CYLINDER_SIZE", code: "SIZE-6KG", name: "6kg", capacityKg: 6, description: "Small household cylinder size" },
  { type: "CYLINDER_SIZE", code: "SIZE-13KG", name: "13kg", capacityKg: 13, description: "Standard household cylinder size" },
  { type: "CYLINDER_SIZE", code: "SIZE-50KG", name: "50kg", capacityKg: 50, description: "Commercial cylinder size" },
  { type: "CYLINDER_CATEGORY", code: "HOUSEHOLD", name: "Household", description: "Domestic cooking gas cylinders" },
  { type: "CYLINDER_CATEGORY", code: "COMMERCIAL", name: "Commercial", description: "Business and hospitality cylinders" },
  { type: "SKU_MASTER", code: "LPG-6KG", name: "6kg LPG Cylinder", capacityKg: 6, description: "Selectable 6kg LPG SKU" },
  { type: "SKU_MASTER", code: "LPG-13KG", name: "13kg LPG Cylinder", capacityKg: 13, description: "Selectable 13kg LPG SKU" },
  { type: "SKU_MASTER", code: "LPG-50KG", name: "50kg LPG Cylinder", capacityKg: 50, description: "Selectable 50kg LPG SKU" },
  { type: "PRICE", code: "PRICE-6KG", name: "6kg Standard Price", amount: 1200, description: "Placeholder retail price" },
  { type: "PRICE", code: "PRICE-13KG", name: "13kg Standard Price", amount: 2800, description: "Placeholder retail price" },
  { type: "TAX", code: "VAT-16", name: "VAT 16%", rate: 16, description: "Standard VAT placeholder" },
  { type: "DISCOUNT_PROMOTION", code: "WELCOME-5", name: "Welcome 5%", rate: 5, description: "Inactive promotion placeholder", isActive: false },
  { type: "DELIVERY_FEE", code: "DEL-NBO", name: "Nairobi Delivery Fee", amount: 300, description: "Placeholder city delivery fee" },
  { type: "REGION", code: "REG-NBO", name: "Nairobi Region", description: "Central Nairobi operating area" },
  { type: "REGION", code: "REG-COAST", name: "Coast Region", description: "Coastal operating area" },
  { type: "REGION", code: "REG-WESTERN", name: "Western Kenya Region", description: "Western Kenya operating area" },
  { type: "ZONE", code: "ZONE-WEST", name: "Westlands Zone", description: "Nairobi zone placeholder", parentCode: "REG-NBO", parentType: "REGION" },
  { type: "ZONE", code: "ZONE-WESTERN-SERVICE", name: "Western Kenya Service Zone", description: "Western Kenya service centre zone", parentCode: "REG-WESTERN", parentType: "REGION" },
  { type: "ZONE", code: "ZONE-NBO-SERVICE", name: "Nairobi Service Zone", description: "Nairobi service centre zone", parentCode: "REG-NBO", parentType: "REGION" },
  { type: "ROUTE", code: "ROUTE-WEST-01", name: "Westlands Route 01", description: "Route placeholder only", parentCode: "ZONE-WEST", parentType: "ZONE" },
  { type: "ROUTE", code: "ROUTE-WESTERN-01", name: "Western Kenya Service Route", description: "Route covering Western Kenya service centres", parentCode: "ZONE-WESTERN-SERVICE", parentType: "ZONE" },
  { type: "ROUTE", code: "ROUTE-NBO-01", name: "Nairobi Service Route", description: "Route covering Nairobi service centres", parentCode: "ZONE-NBO-SERVICE", parentType: "ZONE" },
  { type: "LOCATION", code: "LOC-HQ", name: "Head Office", description: "Administration location" },
  { type: "LOCATION", code: "DP-MBS", name: "Mombasa Depot", description: "Sample depot assigned to the RSO demo user" },
  {
    type: "LOCATION",
    code: "LOC-CUSTOMER-VIRTUAL",
    name: "Customer Virtual Custody",
    description: "Virtual customer custody location for cylinders issued to customers",
    metadata: { locationType: "CUSTOMER_VIRTUAL", region: "All Regions", activeStatus: "ACTIVE", allowedMovementDirections: ["ISSUE", "RETURN_FROM_CUSTOMER"] }
  },
  {
    type: "WAREHOUSE",
    code: "WH-WANDIEGE-MAIN",
    name: "Wandiege Main Warehouse",
    description: "Main Wells Gas warehouse at Wandiege",
    parentCode: "ZONE-WESTERN-SERVICE",
    parentType: "ZONE",
    metadata: { locationType: "MAIN_WAREHOUSE", region: "Western Kenya", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "ISSUE", "TRANSFER_OUT", "TRANSFER_IN", "RETURN"] }
  },
  {
    type: "WAREHOUSE",
    code: "WH-LAKE-GAS-NBO",
    name: "Lake Gas Nairobi Warehouse",
    description: "Nairobi supplier warehouse for Lake Gas receipts",
    parentCode: "ZONE-NBO-SERVICE",
    parentType: "ZONE",
    metadata: { locationType: "NAIROBI_WAREHOUSE", region: "Nairobi", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "TRANSFER_OUT", "TRANSFER_IN"] }
  },
  {
    type: "WAREHOUSE",
    code: "WH-OILCOM-NBO",
    name: "Oilcom Nairobi Warehouse",
    description: "Nairobi supplier warehouse for Oilcom receipts",
    parentCode: "ZONE-NBO-SERVICE",
    parentType: "ZONE",
    metadata: { locationType: "NAIROBI_WAREHOUSE", region: "Nairobi", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "TRANSFER_OUT", "TRANSFER_IN"] }
  },
  {
    type: "WAREHOUSE",
    code: "WH-NBO",
    name: "Nairobi Main Warehouse",
    description: "Primary Nairobi warehouse",
    parentCode: "ZONE-NBO-SERVICE",
    parentType: "ZONE",
    metadata: { locationType: "NAIROBI_WAREHOUSE", region: "Nairobi", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "ISSUE", "TRANSFER_OUT", "TRANSFER_IN", "RETURN"] }
  },
  {
    type: "WAREHOUSE",
    code: "WH-UGUNJA-SECONDARY",
    name: "Ugunja Secondary Warehouse",
    description: "Secondary warehouse serving Ugunja routes",
    parentCode: "ZONE-WESTERN-SERVICE",
    parentType: "ZONE",
    metadata: { locationType: "SECONDARY_WAREHOUSE", region: "Western Kenya", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "ISSUE", "TRANSFER_OUT", "TRANSFER_IN", "RETURN"] }
  },
  {
    type: "WAREHOUSE",
    code: "PLANT-SABUNI-ROAD",
    name: "Sabuni Road Refilling Plant",
    description: "Refilling plant for cylinder receipts and dispatch",
    parentCode: "ZONE-WESTERN-SERVICE",
    parentType: "ZONE",
    metadata: { locationType: "REFILLING_PLANT", region: "Western Kenya", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "ISSUE", "TRANSFER_OUT", "TRANSFER_IN", "REFILL"] }
  },
  { type: "RETAIL_OUTLET", code: "RO-KSM", name: "Kisumu Retail Outlet", description: "Sample retail outlet", parentCode: "ZONE-WESTERN-SERVICE", parentType: "ZONE", metadata: { locationType: "SERVICE_CENTRE", region: "Western Kenya", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "SALE", "RETURN"] } },
  { type: "RETAIL_OUTLET", code: "STN-MBITA", name: "MBITA Service Station", description: "Service station for MBITA", parentCode: "ZONE-WESTERN-SERVICE", parentType: "ZONE", metadata: { locationType: "STATION", region: "Western Kenya", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "SALE", "RETURN"] } },
  { type: "RETAIL_OUTLET", code: "STN-UGUNJA-A", name: "UGUNJA A Service Station", description: "Service station for UGUNJA A", parentCode: "ZONE-WESTERN-SERVICE", parentType: "ZONE", metadata: { locationType: "STATION", region: "Western Kenya", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "SALE", "RETURN"] } },
  { type: "RETAIL_OUTLET", code: "STN-UGUNJA-B", name: "UGUNJA B Service Station", description: "Service station for UGUNJA B", parentCode: "ZONE-WESTERN-SERVICE", parentType: "ZONE", metadata: { locationType: "STATION", region: "Western Kenya", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "SALE", "RETURN"] } },
  { type: "RETAIL_OUTLET", code: "STN-CBD", name: "CBD Service Station", description: "Service station for CBD", parentCode: "ZONE-WESTERN-SERVICE", parentType: "ZONE", metadata: { locationType: "STATION", region: "Western Kenya", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "SALE", "RETURN"] } },
  { type: "RETAIL_OUTLET", code: "STN-KSM-1", name: "KSM 1 Service Station", description: "Service station for KSM 1", parentCode: "ZONE-WESTERN-SERVICE", parentType: "ZONE", metadata: { locationType: "STATION", region: "Western Kenya", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "SALE", "RETURN"] } },
  { type: "RETAIL_OUTLET", code: "SC-KIBUYE", name: "KIBUYE Service Centre", description: "Western Kenya service centre", parentCode: "ZONE-WESTERN-SERVICE", parentType: "ZONE", metadata: { locationType: "SERVICE_CENTRE", region: "Western Kenya", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "SALE", "RETURN"] } },
  { type: "RETAIL_OUTLET", code: "SC-POLYVIEW", name: "POLYVIEW Service Centre", description: "Western Kenya service centre", parentCode: "ZONE-WESTERN-SERVICE", parentType: "ZONE", metadata: { locationType: "SERVICE_CENTRE", region: "Western Kenya", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "SALE", "RETURN"] } },
  { type: "RETAIL_OUTLET", code: "SC-MANYATTA", name: "MANYATTA Service Centre", description: "Western Kenya service centre", parentCode: "ZONE-WESTERN-SERVICE", parentType: "ZONE", metadata: { locationType: "SERVICE_CENTRE", region: "Western Kenya", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "SALE", "RETURN"] } },
  { type: "RETAIL_OUTLET", code: "SC-MIGOSI", name: "MIGOSI Service Centre", description: "Western Kenya service centre", parentCode: "ZONE-WESTERN-SERVICE", parentType: "ZONE", metadata: { locationType: "SERVICE_CENTRE", region: "Western Kenya", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "SALE", "RETURN"] } },
  { type: "RETAIL_OUTLET", code: "SC-KAKAMEGA", name: "KAKAMEGA Service Centre", description: "Western Kenya service centre", parentCode: "ZONE-WESTERN-SERVICE", parentType: "ZONE", metadata: { locationType: "SERVICE_CENTRE", region: "Western Kenya", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "SALE", "RETURN"] } },
  { type: "RETAIL_OUTLET", code: "SC-GARDEN-ESTATE", name: "GARDEN ESTATE Service Centre", description: "Nairobi service centre", parentCode: "ZONE-NBO-SERVICE", parentType: "ZONE", metadata: { locationType: "SERVICE_CENTRE", region: "Nairobi", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "SALE", "RETURN"] } },
  { type: "RETAIL_OUTLET", code: "SC-JOGOO-ROAD", name: "JOGOO ROAD Service Centre", description: "Nairobi service centre", parentCode: "ZONE-NBO-SERVICE", parentType: "ZONE", metadata: { locationType: "SERVICE_CENTRE", region: "Nairobi", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "SALE", "RETURN"] } },
  { type: "RETAIL_OUTLET", code: "SC-NAIROBI-WEST", name: "NAIROBI WEST Service Centre", description: "Nairobi service centre", parentCode: "ZONE-NBO-SERVICE", parentType: "ZONE", metadata: { locationType: "SERVICE_CENTRE", region: "Nairobi", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "SALE", "RETURN"] } },
  { type: "RETAIL_OUTLET", code: "SC-DAGORETTI", name: "DAGORETTI Service Centre", description: "Nairobi service centre", parentCode: "ZONE-NBO-SERVICE", parentType: "ZONE", metadata: { locationType: "SERVICE_CENTRE", region: "Nairobi", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "SALE", "RETURN"] } },
  { type: "RETAIL_OUTLET", code: "SC-MLOLONGO", name: "MLOLONGO Service Centre", description: "Nairobi service centre", parentCode: "ZONE-NBO-SERVICE", parentType: "ZONE", metadata: { locationType: "SERVICE_CENTRE", region: "Nairobi", activeStatus: "ACTIVE", allowedMovementDirections: ["RECEIPT", "SALE", "RETURN"] } },
  { type: "VEHICLE", code: "TRK-001", name: "Delivery Truck 001", description: "Sample delivery vehicle", metadata: { locationType: "VAN", region: "Nairobi", activeStatus: "ACTIVE", allowedMovementDirections: ["LOAD", "ISSUE", "RETURN", "TRANSFER_IN", "TRANSFER_OUT"] } },
  { type: "VEHICLE", code: "VAN-KDK-152E", name: "KDK 152E Van", description: "Sales and delivery van KDK 152E", metadata: { locationType: "VAN", region: "Western Kenya", activeStatus: "ACTIVE", allowedMovementDirections: ["LOAD", "ISSUE", "RETURN", "TRANSFER_IN", "TRANSFER_OUT"] } },
  { type: "VEHICLE", code: "VAN-KCX-301Q", name: "KCX 301Q Van", description: "Sales and delivery van KCX 301Q", metadata: { locationType: "VAN", region: "Western Kenya", activeStatus: "ACTIVE", allowedMovementDirections: ["LOAD", "ISSUE", "RETURN", "TRANSFER_IN", "TRANSFER_OUT"] } },
  { type: "VEHICLE", code: "TUKTUK", name: "TUKTUK", description: "Tuktuk delivery vehicle", metadata: { locationType: "VAN", region: "Western Kenya", activeStatus: "ACTIVE", allowedMovementDirections: ["LOAD", "ISSUE", "RETURN", "TRANSFER_IN", "TRANSFER_OUT"] } },
  { type: "MAINTENANCE_LOCATION", code: "MAINT-NBO", name: "Nairobi Maintenance Bay", description: "Maintenance holding location", metadata: { locationType: "MAINTENANCE", region: "Nairobi", activeStatus: "ACTIVE", allowedMovementDirections: ["TRANSFER_IN", "TRANSFER_OUT"] } },
  { type: "DAMAGED_QUARANTINE_LOCATION", code: "DMG-NBO", name: "Nairobi Damaged Quarantine", description: "Damaged cylinder quarantine location", metadata: { locationType: "QUARANTINE", region: "Nairobi", activeStatus: "ACTIVE", allowedMovementDirections: ["TRANSFER_IN", "TRANSFER_OUT", "SCRAP"] } },
  { type: "DAMAGED_QUARANTINE_LOCATION", code: "DMG-WANDIEGE", name: "Wandiege Quarantine", description: "Damaged cylinder quarantine location for Wandiege operations", metadata: { locationType: "QUARANTINE", region: "Western Kenya", activeStatus: "ACTIVE", allowedMovementDirections: ["TRANSFER_IN", "TRANSFER_OUT", "SCRAP"] } },
  { type: "STOCK_THRESHOLD", code: "THRESH-13KG-WH", name: "13kg Warehouse Minimum", threshold: 50, description: "Placeholder minimum stock threshold" }
];
