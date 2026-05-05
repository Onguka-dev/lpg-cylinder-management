import { z } from "zod";
import type { AppRole } from "@/lib/auth-types";

export const customerCategories = ["DOMESTIC", "COMMERCIAL", "INDUSTRIAL"] as const;
export const customerStatuses = ["ACTIVE", "SUSPENDED", "BLACKLISTED"] as const;

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
  phone: z
    .string()
    .trim()
    .min(7, "Phone must be at least 7 digits.")
    .max(20, "Phone must be 20 characters or fewer.")
    .regex(/^\+?[0-9 -]+$/, "Phone can only include digits, spaces, hyphens, and an optional plus sign."),
  proofReference: z
    .string()
    .trim()
    .min(3, "ID/passport/proof reference must be at least 3 characters.")
    .max(40, "ID/passport/proof reference must be 40 characters or fewer."),
  category: z.enum(customerCategories),
  address: z.string().trim().min(3, "Address must be at least 3 characters.").max(180),
  latitude: z.coerce.number().min(-90, "Latitude must be at least -90.").max(90, "Latitude cannot exceed 90.").optional().nullable(),
  longitude: z.coerce.number().min(-180, "Longitude must be at least -180.").max(180, "Longitude cannot exceed 180.").optional().nullable(),
  status: z.enum(customerStatuses).default("ACTIVE"),
  creditLimit: z.coerce.number().nonnegative("Credit limit cannot be negative.").optional().nullable(),
  notes: z.string().trim().max(500, "Notes must be 500 characters or fewer.").optional().nullable()
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

export function canManageCustomers(role: AppRole) {
  return role === "ADMIN" || role === "RSO" || role === "MSO";
}

export function canViewCustomers(role: AppRole) {
  return canManageCustomers(role) || role === "AUDITOR";
}

export function normalizeCustomerInput(input: CustomerFormValues) {
  return {
    name: input.name.trim(),
    phone: input.phone.trim(),
    proofReference: input.proofReference.trim().toUpperCase(),
    category: input.category,
    address: input.address.trim(),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    status: input.status,
    creditLimit: input.creditLimit ?? null,
    notes: input.notes?.trim() || null
  };
}

export const seedCustomers: CustomerFormValues[] = [
  {
    name: "Mary Wanjiku",
    phone: "+254700111222",
    proofReference: "ID-100200",
    category: "DOMESTIC",
    address: "Kilimani, Nairobi",
    latitude: -1.2921,
    longitude: 36.8219,
    status: "ACTIVE",
    creditLimit: 5000,
    notes: "Prefers 13kg household cylinders."
  },
  {
    name: "Blue Flame Cafe",
    phone: "+254711333444",
    proofReference: "BUS-445566",
    category: "COMMERCIAL",
    address: "Nyali, Mombasa",
    latitude: -4.0435,
    longitude: 39.6682,
    status: "ACTIVE",
    creditLimit: 25000,
    notes: "Commercial kitchen placeholder customer."
  },
  {
    name: "Industrial Heat Ltd",
    phone: "+254722555666",
    proofReference: "PIN-P051234567A",
    category: "INDUSTRIAL",
    address: "Industrial Area, Nairobi",
    latitude: -1.3192,
    longitude: 36.8573,
    status: "SUSPENDED",
    creditLimit: 100000,
    notes: "Industrial placeholder customer."
  }
];
