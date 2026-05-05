import { z } from "zod";

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

export const seedMasterDataRecords: MasterDataFormValues[] = [
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
  { type: "ZONE", code: "ZONE-WEST", name: "Westlands Zone", description: "Nairobi zone placeholder" },
  { type: "ROUTE", code: "ROUTE-WEST-01", name: "Westlands Route 01", description: "Route placeholder only" },
  { type: "LOCATION", code: "LOC-HQ", name: "Head Office", description: "Administration location" },
  { type: "WAREHOUSE", code: "WH-NBO", name: "Nairobi Main Warehouse", description: "Primary Nairobi warehouse" },
  { type: "RETAIL_OUTLET", code: "RO-KSM", name: "Kisumu Retail Outlet", description: "Sample retail outlet" },
  { type: "VEHICLE", code: "TRK-001", name: "Delivery Truck 001", description: "Sample delivery vehicle" },
  { type: "MAINTENANCE_LOCATION", code: "MAINT-NBO", name: "Nairobi Maintenance Bay", description: "Maintenance holding location" },
  { type: "DAMAGED_QUARANTINE_LOCATION", code: "DMG-NBO", name: "Nairobi Damaged Quarantine", description: "Damaged cylinder quarantine location" },
  { type: "STOCK_THRESHOLD", code: "THRESH-13KG-WH", name: "13kg Warehouse Minimum", threshold: 50, description: "Placeholder minimum stock threshold" }
];
