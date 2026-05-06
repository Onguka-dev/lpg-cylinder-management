import { createHash } from "node:crypto";
import {
  CylinderStatus,
  InventoryMovementStatus,
  InventoryMovementType,
  LocationType,
  MasterDataType,
  PrismaClient,
  RoleName
} from "@prisma/client";
import { seedMasterDataRecords } from "../lib/master-data";
import { seedCustomers } from "../lib/customers";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

async function main() {
  const roles = [
    {
      name: RoleName.ADMIN,
      description: "System administration and organization-wide oversight"
    },
    {
      name: RoleName.WAREHOUSE_MANAGER,
      description: "Warehouse stock visibility and cylinder handling"
    },
    {
      name: RoleName.RSO,
      description: "Regional sales operations placeholder role"
    },
    {
      name: RoleName.MSO,
      description: "Market sales operations placeholder role"
    },
    {
      name: RoleName.AUDITOR,
      description: "Read-focused audit and compliance placeholder role"
    },
    {
      name: RoleName.CUSTOMER,
      description: "Customer self-service placeholder role"
    }
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: role,
      create: role
    });
  }

  const locations = [
    { code: "HQ", name: "Head Office", type: LocationType.HEAD_OFFICE },
    { code: "WH-NBO", name: "Nairobi Main Warehouse", type: LocationType.WAREHOUSE },
    { code: "DP-MBS", name: "Mombasa Depot", type: LocationType.DEPOT },
    { code: "RO-KSM", name: "Kisumu Retail Outlet", type: LocationType.RETAIL_OUTLET }
  ];

  for (const location of locations) {
    await prisma.location.upsert({
      where: { code: location.code },
      update: location,
      create: location
    });
  }

  const roleMap = await prisma.role.findMany();
  const locationMap = await prisma.location.findMany();

  const roleId = (name: RoleName) => roleMap.find((role) => role.name === name)?.id ?? "";
  const locationId = (code: string) =>
    locationMap.find((location) => location.code === code)?.id ?? null;

  const users = [
    {
      name: "Amina Okello",
      email: "admin@example.com",
      passwordHash: hashPassword("password123"),
      roleId: roleId(RoleName.ADMIN),
      locationId: locationId("HQ")
    },
    {
      name: "Peter Mwangi",
      email: "warehouse@example.com",
      passwordHash: hashPassword("password123"),
      roleId: roleId(RoleName.WAREHOUSE_MANAGER),
      locationId: locationId("WH-NBO")
    },
    {
      name: "Grace Njeri",
      email: "rso@example.com",
      passwordHash: hashPassword("password123"),
      roleId: roleId(RoleName.RSO),
      locationId: locationId("DP-MBS")
    },
    {
      name: "David Otieno",
      email: "mso@example.com",
      passwordHash: hashPassword("password123"),
      roleId: roleId(RoleName.MSO),
      locationId: locationId("RO-KSM")
    },
    {
      name: "Sarah Wambui",
      email: "auditor@example.com",
      passwordHash: hashPassword("password123"),
      roleId: roleId(RoleName.AUDITOR),
      locationId: locationId("HQ")
    },
    {
      name: "Customer Demo",
      email: "customer@example.com",
      passwordHash: hashPassword("password123"),
      roleId: roleId(RoleName.CUSTOMER),
      locationId: locationId("RO-KSM")
    }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: user,
      create: user
    });
  }

  const skus = [
    { name: "6kg LPG Cylinder", capacityKg: 6, description: "Small household cylinder" },
    { name: "13kg LPG Cylinder", capacityKg: 13, description: "Standard household cylinder" },
    { name: "50kg LPG Cylinder", capacityKg: 50, description: "Commercial cylinder" }
  ];

  for (const sku of skus) {
    await prisma.lpgSku.upsert({
      where: { name: sku.name },
      update: sku,
      create: sku
    });
  }

  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@example.com" }
  });

  if (adminUser) {
    await prisma.auditLog.deleteMany({
      where: {
        action: {
          in: ["STAGE_1_SEED", "RBAC_PLACEHOLDER"]
        }
      }
    });

    await prisma.auditLog.createMany({
      data: [
        {
          action: "STAGE_1_SEED",
          details: "Seeded authentication roles, demo users, and placeholder audit log",
          userId: adminUser.id
        },
        {
          action: "RBAC_PLACEHOLDER",
          details: "Audit logs are visible to Admin and Auditor roles in Stage 1",
          userId: adminUser.id
        }
      ]
    });
  }

  for (const record of seedMasterDataRecords) {
    await prisma.masterDataRecord.upsert({
      where: {
        type_code: {
          type: record.type as MasterDataType,
          code: record.code.toUpperCase()
        }
      },
      update: {
        name: record.name,
        description: record.description,
        isActive: record.isActive ?? true,
        amount: record.amount,
        rate: record.rate,
        capacityKg: record.capacityKg,
        threshold: record.threshold,
        metadata: {}
      },
      create: {
        type: record.type as MasterDataType,
        code: record.code.toUpperCase(),
        name: record.name,
        description: record.description,
        isActive: record.isActive ?? true,
        amount: record.amount,
        rate: record.rate,
        capacityKg: record.capacityKg,
        threshold: record.threshold,
        metadata: {}
      }
    });
  }

  for (const customer of seedCustomers) {
    await prisma.customer.upsert({
      where: { phone: customer.phone },
      update: {
        name: customer.name,
        proofReference: customer.proofReference,
        category: customer.category,
        address: customer.address,
        latitude: customer.latitude,
        longitude: customer.longitude,
        status: customer.status,
        creditLimit: customer.creditLimit,
        notes: customer.notes
      },
      create: {
        name: customer.name,
        phone: customer.phone,
        proofReference: customer.proofReference,
        category: customer.category,
        address: customer.address,
        latitude: customer.latitude,
        longitude: customer.longitude,
        status: customer.status,
        creditLimit: customer.creditLimit,
        notes: customer.notes
      }
    });
  }

  const [sku6kg, sku13kg, sku50kg, warehouse, retailOutlet, mombasaLocation, maintenanceLocation, damagedLocation] =
    await Promise.all([
      prisma.masterDataRecord.findFirst({ where: { type: MasterDataType.SKU_MASTER, code: "LPG-6KG" } }),
      prisma.masterDataRecord.findFirst({ where: { type: MasterDataType.SKU_MASTER, code: "LPG-13KG" } }),
      prisma.masterDataRecord.findFirst({ where: { type: MasterDataType.SKU_MASTER, code: "LPG-50KG" } }),
      prisma.masterDataRecord.findFirst({ where: { type: MasterDataType.WAREHOUSE, code: "WH-NBO" } }),
      prisma.masterDataRecord.findFirst({ where: { type: MasterDataType.RETAIL_OUTLET, code: "RO-KSM" } }),
      prisma.masterDataRecord.findFirst({ where: { type: MasterDataType.LOCATION, code: "DP-MBS" } }),
      prisma.masterDataRecord.findFirst({ where: { type: MasterDataType.MAINTENANCE_LOCATION, code: "MAINT-NBO" } }),
      prisma.masterDataRecord.findFirst({ where: { type: MasterDataType.DAMAGED_QUARANTINE_LOCATION, code: "DMG-NBO" } })
    ]);

  const seedCylinders = [
    { serialNumber: "CYL-6KG-0001", barcode: "RFID-6KG-0001", skuId: sku6kg?.id, currentLocationId: warehouse?.id, status: CylinderStatus.FILLED },
    { serialNumber: "CYL-6KG-0002", barcode: "RFID-6KG-0002", skuId: sku6kg?.id, currentLocationId: retailOutlet?.id, status: CylinderStatus.EMPTY },
    { serialNumber: "CYL-6KG-RSO-0001", barcode: "RFID-6KG-RSO-0001", skuId: sku6kg?.id, currentLocationId: mombasaLocation?.id, status: CylinderStatus.FILLED },
    { serialNumber: "CYL-6KG-RSO-0002", barcode: "RFID-6KG-RSO-0002", skuId: sku6kg?.id, currentLocationId: mombasaLocation?.id, status: CylinderStatus.FILLED },
    { serialNumber: "CYL-13KG-0001", barcode: "RFID-13KG-0001", skuId: sku13kg?.id, currentLocationId: warehouse?.id, status: CylinderStatus.FILLED },
    { serialNumber: "CYL-13KG-0002", barcode: "RFID-13KG-0002", skuId: sku13kg?.id, currentLocationId: damagedLocation?.id, status: CylinderStatus.DAMAGED },
    { serialNumber: "CYL-13KG-RSO-0001", barcode: "RFID-13KG-RSO-0001", skuId: sku13kg?.id, currentLocationId: mombasaLocation?.id, status: CylinderStatus.FILLED },
    { serialNumber: "CYL-50KG-0001", barcode: "RFID-50KG-0001", skuId: sku50kg?.id, currentLocationId: maintenanceLocation?.id, status: CylinderStatus.UNDER_MAINTENANCE }
  ];

  for (const cylinder of seedCylinders) {
    if (!cylinder.skuId || !cylinder.currentLocationId) continue;

    const saved = await prisma.cylinder.upsert({
      where: { serialNumber: cylinder.serialNumber },
      update: {
        barcode: cylinder.barcode,
        skuId: cylinder.skuId,
        currentLocationId: cylinder.currentLocationId,
        status: cylinder.status,
        notes: "Seed cylinder for Stage 4 inventory foundation"
      },
      create: {
        serialNumber: cylinder.serialNumber,
        barcode: cylinder.barcode,
        skuId: cylinder.skuId,
        currentLocationId: cylinder.currentLocationId,
        status: cylinder.status,
        notes: "Seed cylinder for Stage 4 inventory foundation"
      }
    });

    const existingHistory = await prisma.cylinderHistory.findFirst({
      where: { cylinderId: saved.id, reason: "Stage 4 seed cylinder" }
    });

    if (!existingHistory) {
      await prisma.cylinderHistory.create({
        data: {
          cylinderId: saved.id,
          newStatus: saved.status,
          newLocationId: saved.currentLocationId,
          reason: "Stage 4 seed cylinder"
        }
      });
    }
  }

  const warehouseUser = await prisma.user.findUnique({ where: { email: "warehouse@example.com" } });
  const rsoUser = await prisma.user.findUnique({ where: { email: "rso@example.com" } });
  const mombasaDepot = await prisma.masterDataRecord.findFirst({
    where: { type: MasterDataType.LOCATION, code: "DP-MBS" }
  });

  if (sku13kg && warehouse && mombasaDepot && warehouseUser && rsoUser) {
    const movement = await prisma.inventoryMovement.upsert({
      where: { reference: "TRF-STAGE5-SEED" },
      update: {
        type: InventoryMovementType.TRANSFER,
        status: InventoryMovementStatus.REQUESTED,
        skuId: sku13kg.id,
        sourceLocationId: warehouse.id,
        destinationLocationId: mombasaDepot.id,
        sourceStatus: CylinderStatus.FILLED,
        destinationStatus: CylinderStatus.FILLED,
        requestedQuantity: 1,
        notes: "Seed transfer request for Stage 5 movement workflow testing",
        requestedById: rsoUser.id
      },
      create: {
        reference: "TRF-STAGE5-SEED",
        type: InventoryMovementType.TRANSFER,
        status: InventoryMovementStatus.REQUESTED,
        skuId: sku13kg.id,
        sourceLocationId: warehouse.id,
        destinationLocationId: mombasaDepot.id,
        sourceStatus: CylinderStatus.FILLED,
        destinationStatus: CylinderStatus.FILLED,
        requestedQuantity: 1,
        notes: "Seed transfer request for Stage 5 movement workflow testing",
        requestedById: rsoUser.id
      }
    });

    const existingMovementHistory = await prisma.inventoryMovementHistory.findFirst({
      where: { movementId: movement.id, action: "Stage 5 seed movement" }
    });

    if (!existingMovementHistory) {
      await prisma.inventoryMovementHistory.create({
        data: {
          movementId: movement.id,
          toStatus: movement.status,
          action: "Stage 5 seed movement",
          details: "Seeded transfer request for approval, dispatch, and receiving checks.",
          changedById: warehouseUser.id
        }
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
