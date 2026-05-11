import { z } from "zod";

export const roleSchema = z.object({
  name: z.enum(["ADMIN", "WAREHOUSE_MANAGER", "PLANT_MANAGER", "RSO", "MSO", "SERVICE_CENTRE_STAFF", "FINANCE_SAP_REVIEWER", "AUDITOR", "CUSTOMER"]),
  description: z.string().min(3)
});

export const locationSchema = z.object({
  code: z.string().min(2).max(12),
  name: z.string().min(2),
  type: z.enum(["HEAD_OFFICE", "WAREHOUSE", "DEPOT", "RETAIL_OUTLET"])
});

export const lpgSkuSchema = z.object({
  name: z.string().min(3),
  capacityKg: z.number().int().positive(),
  description: z.string().min(3)
});

export const sampleUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: roleSchema.shape.name,
  locationCode: locationSchema.shape.code
});
