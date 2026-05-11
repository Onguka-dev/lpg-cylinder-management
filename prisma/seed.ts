import { createHash } from "node:crypto";
import {
  CylinderStatus,
  DeliveryStatus,
  InventoryMovementStatus,
  InventoryMovementType,
  LocationType,
  MasterDataType,
  NotificationChannel,
  PrismaClient,
  RoleName
} from "@prisma/client";
import { seedMasterDataRecords } from "../lib/master-data";
import { seedCustomers } from "../lib/customers";
import { seedNotificationTemplates } from "../lib/notifications";
import { securityControlSeed } from "../lib/security";
import { seedIntegrationSettings } from "../lib/integrations";

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
      name: "Admin Account",
      email: "admin@example.com",
      passwordHash: hashPassword("password123"),
      roleId: roleId(RoleName.ADMIN),
      locationId: locationId("HQ")
    },
    {
      name: "Warehouse Manager Account",
      email: "warehouse@example.com",
      passwordHash: hashPassword("password123"),
      roleId: roleId(RoleName.WAREHOUSE_MANAGER),
      locationId: locationId("WH-NBO")
    },
    {
      name: "RSO Account",
      email: "rso@example.com",
      passwordHash: hashPassword("password123"),
      roleId: roleId(RoleName.RSO),
      locationId: locationId("DP-MBS")
    },
    {
      name: "MSO Account",
      email: "mso@example.com",
      passwordHash: hashPassword("password123"),
      roleId: roleId(RoleName.MSO),
      locationId: locationId("RO-KSM")
    },
    {
      name: "Auditor Account",
      email: "auditor@example.com",
      passwordHash: hashPassword("password123"),
      roleId: roleId(RoleName.AUDITOR),
      locationId: locationId("HQ")
    },
    {
      name: "Customer Account",
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

  const [sku6kg, sku13kg, sku50kg, warehouse, retailOutlet, mombasaLocation, maintenanceLocation, damagedLocation, vehicle] =
    await Promise.all([
      prisma.masterDataRecord.findFirst({ where: { type: MasterDataType.SKU_MASTER, code: "LPG-6KG" } }),
      prisma.masterDataRecord.findFirst({ where: { type: MasterDataType.SKU_MASTER, code: "LPG-13KG" } }),
      prisma.masterDataRecord.findFirst({ where: { type: MasterDataType.SKU_MASTER, code: "LPG-50KG" } }),
      prisma.masterDataRecord.findFirst({ where: { type: MasterDataType.WAREHOUSE, code: "WH-NBO" } }),
      prisma.masterDataRecord.findFirst({ where: { type: MasterDataType.RETAIL_OUTLET, code: "RO-KSM" } }),
      prisma.masterDataRecord.findFirst({ where: { type: MasterDataType.LOCATION, code: "DP-MBS" } }),
      prisma.masterDataRecord.findFirst({ where: { type: MasterDataType.MAINTENANCE_LOCATION, code: "MAINT-NBO" } }),
      prisma.masterDataRecord.findFirst({ where: { type: MasterDataType.DAMAGED_QUARANTINE_LOCATION, code: "DMG-NBO" } }),
      prisma.masterDataRecord.findFirst({ where: { type: MasterDataType.VEHICLE, code: "TRK-001" } })
    ]);

  const seedCylinders = [
    { serialNumber: "CYL-6KG-0001", barcode: "RFID-6KG-0001", skuId: sku6kg?.id, currentLocationId: warehouse?.id, status: CylinderStatus.FILLED },
    { serialNumber: "CYL-6KG-0002", barcode: "RFID-6KG-0002", skuId: sku6kg?.id, currentLocationId: retailOutlet?.id, status: CylinderStatus.EMPTY },
    { serialNumber: "CYL-6KG-RSO-0001", barcode: "RFID-6KG-RSO-0001", skuId: sku6kg?.id, currentLocationId: mombasaLocation?.id, status: CylinderStatus.FILLED },
    { serialNumber: "CYL-6KG-RSO-0002", barcode: "RFID-6KG-RSO-0002", skuId: sku6kg?.id, currentLocationId: mombasaLocation?.id, status: CylinderStatus.FILLED },
    { serialNumber: "CYL-13KG-0001", barcode: "RFID-13KG-0001", skuId: sku13kg?.id, currentLocationId: warehouse?.id, status: CylinderStatus.FILLED },
    { serialNumber: "CYL-13KG-0002", barcode: "RFID-13KG-0002", skuId: sku13kg?.id, currentLocationId: damagedLocation?.id, status: CylinderStatus.DAMAGED },
    { serialNumber: "CYL-13KG-RSO-0001", barcode: "RFID-13KG-RSO-0001", skuId: sku13kg?.id, currentLocationId: mombasaLocation?.id, status: CylinderStatus.FILLED },
    { serialNumber: "CYL-50KG-0001", barcode: "RFID-50KG-0001", skuId: sku50kg?.id, currentLocationId: maintenanceLocation?.id, status: CylinderStatus.UNDER_MAINTENANCE },
    { serialNumber: "CYL-6KG-VEH-0001", barcode: "RFID-6KG-VEH-0001", skuId: sku6kg?.id, currentLocationId: vehicle?.id, status: CylinderStatus.FILLED },
    { serialNumber: "CYL-6KG-VEH-0002", barcode: "RFID-6KG-VEH-0002", skuId: sku6kg?.id, currentLocationId: vehicle?.id, status: CylinderStatus.FILLED },
    { serialNumber: "CYL-6KG-VEH-0003", barcode: "RFID-6KG-VEH-0003", skuId: sku6kg?.id, currentLocationId: vehicle?.id, status: CylinderStatus.FILLED },
    { serialNumber: "CYL-6KG-VEH-0004", barcode: "RFID-6KG-VEH-0004", skuId: sku6kg?.id, currentLocationId: vehicle?.id, status: CylinderStatus.FILLED },
    { serialNumber: "CYL-13KG-VEH-0001", barcode: "RFID-13KG-VEH-0001", skuId: sku13kg?.id, currentLocationId: vehicle?.id, status: CylinderStatus.FILLED },
    { serialNumber: "CYL-13KG-VEH-0002", barcode: "RFID-13KG-VEH-0002", skuId: sku13kg?.id, currentLocationId: vehicle?.id, status: CylinderStatus.FILLED },
    { serialNumber: "CYL-13KG-VEH-0003", barcode: "RFID-13KG-VEH-0003", skuId: sku13kg?.id, currentLocationId: vehicle?.id, status: CylinderStatus.FILLED },
    { serialNumber: "CYL-13KG-VEH-EMPTY-0001", barcode: "RFID-13KG-VEH-EMPTY-0001", skuId: sku13kg?.id, currentLocationId: vehicle?.id, status: CylinderStatus.EMPTY }
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

  const maryCustomer = await prisma.customer.findFirst({ where: { phone: "+254700111222" } });
  const westlandsZone = await prisma.masterDataRecord.findFirst({ where: { type: MasterDataType.ZONE, code: "ZONE-WEST" } });
  const westlandsRoute = await prisma.masterDataRecord.findFirst({ where: { type: MasterDataType.ROUTE, code: "ROUTE-WEST-01" } });
  const msoUser = await prisma.user.findUnique({ where: { email: "mso@example.com" } });

  if (maryCustomer && sku6kg && sku13kg && westlandsZone && adminUser) {
    const order = await prisma.customerOrder.upsert({
      where: { orderNumber: "ORD-STAGE7-SEED" },
      update: {
        customerId: maryCustomer.id,
        channel: "CALL_CENTRE",
        isPriority: true,
        deliveryZoneId: westlandsZone.id,
        expectedDeliveryDate: new Date("2026-05-10"),
        notes: "Seed bulk order for Stage 7 order and Stage 9 delivery testing",
        deliveryPlaceholder: "Delivery assignment is active in Stage 9.",
        createdById: adminUser.id
      },
      create: {
        orderNumber: "ORD-STAGE7-SEED",
        customerId: maryCustomer.id,
        channel: "CALL_CENTRE",
        isPriority: true,
        deliveryZoneId: westlandsZone.id,
        expectedDeliveryDate: new Date("2026-05-10"),
        notes: "Seed bulk order for Stage 7 order and Stage 9 delivery testing",
        deliveryPlaceholder: "Delivery assignment is active in Stage 9.",
        createdById: adminUser.id
      }
    });

    await prisma.customerOrderItem.deleteMany({ where: { orderId: order.id } });
    await prisma.customerOrderItem.createMany({
      data: [
        { orderId: order.id, skuId: sku6kg.id, quantity: 2, notes: "Seed 6kg line" },
        { orderId: order.id, skuId: sku13kg.id, quantity: 1, notes: "Seed 13kg line" }
      ]
    });

    const existingOrderHistory = await prisma.customerOrderHistory.findFirst({
      where: { orderId: order.id, action: "Stage 7 seed order" }
    });
    if (!existingOrderHistory) {
      await prisma.customerOrderHistory.create({
        data: {
          orderId: order.id,
          toStatus: order.status,
          action: "Stage 7 seed order",
          details: "Seeded multi-line priority order.",
          changedById: adminUser.id
        }
      });
    }

    if (vehicle && msoUser) {
      const delivery = await prisma.delivery.upsert({
        where: { deliveryNumber: "DLV-STAGE9-SEED" },
        update: {
          orderId: order.id,
          routeId: westlandsRoute?.id ?? null,
          zoneId: westlandsZone.id,
          vehicleId: vehicle.id,
          assignedUserId: msoUser.id,
          driverName: "Assigned Driver",
          status: DeliveryStatus.ASSIGNED
        },
        create: {
          deliveryNumber: "DLV-STAGE9-SEED",
          orderId: order.id,
          routeId: westlandsRoute?.id ?? null,
          zoneId: westlandsZone.id,
          vehicleId: vehicle.id,
          assignedUserId: msoUser.id,
          driverName: "Assigned Driver",
          status: DeliveryStatus.ASSIGNED,
          createdById: adminUser.id
        }
      });

      if (order.status !== "ASSIGNED") {
        await prisma.customerOrder.update({
          where: { id: order.id },
          data: { status: "ASSIGNED" }
        });
      }

      const existingDeliveryHistory = await prisma.deliveryHistory.findFirst({
        where: { deliveryId: delivery.id, action: "Stage 9 seed delivery" }
      });
      if (!existingDeliveryHistory) {
        await prisma.deliveryHistory.create({
          data: {
            deliveryId: delivery.id,
            toStatus: delivery.status,
            action: "Stage 9 seed delivery",
            details: "Seeded delivery assignment for proof of delivery workflow checks.",
            changedById: adminUser.id
          }
        });
      }
    }
  }

  if (maryCustomer && sku6kg && adminUser) {
    const billingOrder = await prisma.customerOrder.upsert({
      where: { orderNumber: "ORD-STAGE10-SEED" },
      update: {
        customerId: maryCustomer.id,
        status: "DELIVERED",
        channel: "CALL_CENTRE",
        deliveryZoneId: westlandsZone?.id ?? null,
        expectedDeliveryDate: new Date("2026-05-12"),
        notes: "Seed delivered order for Stage 10 billing checks",
        deliveryPlaceholder: "Delivered for billing seed.",
        createdById: adminUser.id
      },
      create: {
        orderNumber: "ORD-STAGE10-SEED",
        customerId: maryCustomer.id,
        status: "DELIVERED",
        channel: "CALL_CENTRE",
        deliveryZoneId: westlandsZone?.id ?? null,
        expectedDeliveryDate: new Date("2026-05-12"),
        notes: "Seed delivered order for Stage 10 billing checks",
        deliveryPlaceholder: "Delivered for billing seed.",
        createdById: adminUser.id
      }
    });

    await prisma.customerOrderItem.deleteMany({ where: { orderId: billingOrder.id } });
    await prisma.customerOrderItem.create({
      data: { orderId: billingOrder.id, skuId: sku6kg.id, quantity: 1, notes: "Stage 10 invoice seed line" }
    });

    const invoice = await prisma.invoice.upsert({
      where: { invoiceNumber: "INV-STAGE10-SEED" },
      update: {
        customerId: maryCustomer.id,
        customerOrderId: billingOrder.id,
        sourceType: "CUSTOMER_ORDER",
        status: "PARTIALLY_PAID",
        subtotalAmount: 1200,
        taxAmount: 192,
        deliveryFeeAmount: 300,
        discountAmount: 100,
        promotionPlaceholder: "Welcome promotion placeholder",
        totalAmount: 1592,
        amountPaid: 800,
        balanceAmount: 792,
        creditLimitChecked: true,
        creditLimitExceeded: false,
        refundPlaceholder: "Refund processing placeholder",
        notes: "Stage 10 seed invoice"
      },
      create: {
        invoiceNumber: "INV-STAGE10-SEED",
        customerId: maryCustomer.id,
        customerOrderId: billingOrder.id,
        sourceType: "CUSTOMER_ORDER",
        status: "PARTIALLY_PAID",
        subtotalAmount: 1200,
        taxAmount: 192,
        deliveryFeeAmount: 300,
        discountAmount: 100,
        promotionPlaceholder: "Welcome promotion placeholder",
        totalAmount: 1592,
        amountPaid: 800,
        balanceAmount: 792,
        creditLimitChecked: true,
        creditLimitExceeded: false,
        refundPlaceholder: "Refund processing placeholder",
        notes: "Stage 10 seed invoice",
        createdById: adminUser.id
      }
    });

    await prisma.invoiceLine.deleteMany({ where: { invoiceId: invoice.id } });
    await prisma.invoiceLine.create({
      data: {
        invoiceId: invoice.id,
        description: sku6kg.name,
        quantity: 1,
        unitAmount: 1200,
        lineTotal: 1200
      }
    });

    await prisma.billingPayment.upsert({
      where: { receiptNumber: "RCT-STAGE10-SEED" },
      update: {
        invoiceId: invoice.id,
        customerId: maryCustomer.id,
        method: "MPESA",
        status: "PAID",
        amount: 800,
        reference: "MPESA-STAGE10-SEED",
        refundPlaceholder: "Refund processing placeholder",
        recordedById: adminUser.id
      },
      create: {
        receiptNumber: "RCT-STAGE10-SEED",
        invoiceId: invoice.id,
        customerId: maryCustomer.id,
        method: "MPESA",
        status: "PAID",
        amount: 800,
        reference: "MPESA-STAGE10-SEED",
        refundPlaceholder: "Refund processing placeholder",
        recordedById: adminUser.id
      }
    });
  }

  if (warehouseUser && warehouse && adminUser) {
    await prisma.dailyReconciliation.upsert({
      where: { reference: "REC-STAGE11-WH-SEED" },
      update: {
        reconciliationDate: new Date("2026-05-06"),
        scope: "WAREHOUSE",
        status: "SUBMITTED",
        ownerId: warehouseUser.id,
        locationId: warehouse.id,
        openingStock: 25,
        goodsReceived: 5,
        salesIssues: 4,
        transfers: 2,
        returns: 1,
        damagedCylinders: 1,
        expectedClosingStock: 25,
        actualClosingStock: 24,
        stockVariance: -1,
        stockExplanation: "One cylinder pending supervisor count confirmation.",
        cashCollections: 1200,
        mpesaCollections: 800,
        cardCollections: 300,
        expectedCash: 2300,
        actualCash: 2250,
        paymentVariance: -50,
        paymentExplanation: "Cash counted short pending till recount.",
        supervisorNotes: "Seeded Stage 11 reconciliation ready for review.",
        createdById: adminUser.id,
        submittedAt: new Date("2026-05-06T18:00:00.000Z")
      },
      create: {
        reference: "REC-STAGE11-WH-SEED",
        reconciliationDate: new Date("2026-05-06"),
        scope: "WAREHOUSE",
        status: "SUBMITTED",
        ownerId: warehouseUser.id,
        locationId: warehouse.id,
        openingStock: 25,
        goodsReceived: 5,
        salesIssues: 4,
        transfers: 2,
        returns: 1,
        damagedCylinders: 1,
        expectedClosingStock: 25,
        actualClosingStock: 24,
        stockVariance: -1,
        stockExplanation: "One cylinder pending supervisor count confirmation.",
        cashCollections: 1200,
        mpesaCollections: 800,
        cardCollections: 300,
        expectedCash: 2300,
        actualCash: 2250,
        paymentVariance: -50,
        paymentExplanation: "Cash counted short pending till recount.",
        supervisorNotes: "Seeded Stage 11 reconciliation ready for review.",
        createdById: adminUser.id,
        submittedAt: new Date("2026-05-06T18:00:00.000Z")
      }
    });
  }

  if (adminUser && warehouse) {
    const safetyCylinder = await prisma.cylinder.findUnique({ where: { serialNumber: "CYL-13KG-0002" } });
    if (safetyCylinder) {
      await prisma.cylinder.update({
        where: { id: safetyCylinder.id },
        data: {
          expiryDate: new Date("2026-12-31"),
          hydroTestDueDate: new Date("2026-06-30"),
          unsafeStatus: true,
          quarantinedStatus: true,
          maintenanceStatus: "IN_PROGRESS",
          status: "DAMAGED"
        }
      });

      await prisma.maintenanceCase.upsert({
        where: { caseNumber: "MNT-STAGE12-SEED" },
        update: {
          cylinderId: safetyCylinder.id,
          status: "QUARANTINED",
          reason: "Seed damaged cylinder case for Stage 12 safety checks",
          inspectionResult: "FAILED",
          inspectionNotes: "Valve damage observed during starter safety inspection.",
          certificateUploadPlaceholder: "Certificate upload placeholder",
          documentUploadPlaceholder: "Maintenance document upload placeholder",
          createdById: adminUser.id,
          inspectedById: adminUser.id,
          quarantinedAt: new Date("2026-05-06T12:00:00.000Z")
        },
        create: {
          caseNumber: "MNT-STAGE12-SEED",
          cylinderId: safetyCylinder.id,
          status: "QUARANTINED",
          reason: "Seed damaged cylinder case for Stage 12 safety checks",
          inspectionResult: "FAILED",
          inspectionNotes: "Valve damage observed during starter safety inspection.",
          certificateUploadPlaceholder: "Certificate upload placeholder",
          documentUploadPlaceholder: "Maintenance document upload placeholder",
          createdById: adminUser.id,
          inspectedById: adminUser.id,
          quarantinedAt: new Date("2026-05-06T12:00:00.000Z")
        }
      });

      await prisma.safetyIncident.upsert({
        where: { incidentNumber: "INC-STAGE12-SEED" },
        update: {
          cylinderId: safetyCylinder.id,
          title: "Seed valve leak incident",
          severity: "MEDIUM",
          incidentDate: new Date("2026-05-06"),
          locationId: warehouse.id,
          description: "Seed incident used to verify safety incident logging and compliance reports.",
          correctiveAction: "Cylinder quarantined and routed to maintenance review.",
          certificateUploadPlaceholder: "Certificate/document upload placeholder",
          photoUploadPlaceholder: "Photo upload placeholder",
          createdById: adminUser.id
        },
        create: {
          incidentNumber: "INC-STAGE12-SEED",
          cylinderId: safetyCylinder.id,
          title: "Seed valve leak incident",
          severity: "MEDIUM",
          incidentDate: new Date("2026-05-06"),
          locationId: warehouse.id,
          description: "Seed incident used to verify safety incident logging and compliance reports.",
          correctiveAction: "Cylinder quarantined and routed to maintenance review.",
          certificateUploadPlaceholder: "Certificate/document upload placeholder",
          photoUploadPlaceholder: "Photo upload placeholder",
          createdById: adminUser.id
        }
      });
    }
  }

  for (const channel of [NotificationChannel.SMS, NotificationChannel.EMAIL, NotificationChannel.PUSH]) {
    await prisma.notificationChannelSetting.upsert({
      where: { channel },
      update: {
        isEnabled: true,
        providerPlaceholder: `${channel} mock provider`,
        senderPlaceholder: channel === "EMAIL" ? "no-reply@example.com" : "LPG Manager"
      },
      create: {
        channel,
        isEnabled: true,
        providerPlaceholder: `${channel} mock provider`,
        senderPlaceholder: channel === "EMAIL" ? "no-reply@example.com" : "LPG Manager"
      }
    });
  }

  for (const template of seedNotificationTemplates) {
    await prisma.notificationTemplate.upsert({
      where: {
        eventType_channel: {
          eventType: template.eventType,
          channel: template.channel
        }
      },
      update: {
        name: template.name,
        subject: template.subject,
        body: template.body,
        isEnabled: template.isEnabled
      },
      create: template
    });
  }

  if (adminUser) {
    const seedNotifications = [
      {
        reference: "NTF-STAGE14-SEED",
        eventType: "LOW_STOCK_ALERT",
        channel: "SMS",
        status: "SENT",
        recipientName: "Warehouse Supervisor",
        recipientContact: "+254700000001",
        subject: "Low stock alert",
        message: "Low stock alert for 6kg LPG at Nairobi Main Warehouse. Current filled stock: 2.",
        payload: { sku: "6kg LPG", location: "Nairobi Main Warehouse", quantity: 2 },
        failureReason: null,
        sentAt: new Date("2026-05-07T06:00:00.000Z")
      },
      {
        reference: "NTF-STAGE14-PENDING",
        eventType: "PENDING_DELIVERY_ALERT",
        channel: "PUSH",
        status: "PENDING",
        recipientName: "MSO Driver",
        recipientContact: "driver-push-placeholder",
        subject: "Pending delivery alert",
        message: "Pending delivery DLV-STAGE9-SEED requires follow-up in Westlands.",
        payload: { reference: "DLV-STAGE9-SEED", zone: "Westlands" },
        failureReason: null,
        sentAt: null
      },
      {
        reference: "NTF-STAGE14-FAILED",
        eventType: "SAFETY_WARNING",
        channel: "EMAIL",
        status: "FAILED",
        recipientName: "Safety Desk",
        recipientContact: "fail-safety@example.com",
        subject: "Safety warning",
        message: "Safety warning INC-STAGE12-SEED could not be delivered by the mock sender.",
        payload: { reference: "INC-STAGE12-SEED" },
        failureReason: "Mock send failed because recipient contains 'fail'.",
        sentAt: null
      }
    ] as const;

    for (const notification of seedNotifications) {
      await prisma.notification.upsert({
        where: { reference: notification.reference },
        update: { ...notification, createdById: adminUser.id },
        create: { ...notification, createdById: adminUser.id }
      });
    }
  }

  if (adminUser) {
    await prisma.offlineSyncItem.upsert({
      where: { clientId: "offline-stage15-seed-conflict" },
      update: {
        type: "DELIVERY_STATUS_DRAFT",
        status: "CONFLICT",
        payload: {
          deliveryId: "seed-delivery-placeholder",
          serverUpdatedAt: "2026-05-07T07:00:00.000Z",
          data: { status: "DELIVERED", otp: "1234" }
        },
        conflictReason: "Seed conflict: delivery changed on the server after the offline snapshot.",
        failedReason: null,
        createdById: adminUser.id,
        syncedAt: new Date("2026-05-07T07:00:00.000Z")
      },
      create: {
        clientId: "offline-stage15-seed-conflict",
        type: "DELIVERY_STATUS_DRAFT",
        status: "CONFLICT",
        payload: {
          deliveryId: "seed-delivery-placeholder",
          serverUpdatedAt: "2026-05-07T07:00:00.000Z",
          data: { status: "DELIVERED", otp: "1234" }
        },
        conflictReason: "Seed conflict: delivery changed on the server after the offline snapshot.",
        createdById: adminUser.id,
        clientCreatedAt: new Date("2026-05-07T06:55:00.000Z"),
        syncedAt: new Date("2026-05-07T07:00:00.000Z")
      }
    });
  }

  for (const setting of seedIntegrationSettings) {
    await prisma.integrationSetting.upsert({
      where: { providerType: setting.providerType },
      update: setting,
      create: setting
    });
  }

  for (const setting of securityControlSeed) {
    await prisma.securityControlSetting.upsert({
      where: { key: setting.key },
      update: setting,
      create: setting
    });
  }

  if (adminUser) {
    const sapSetting = await prisma.integrationSetting.findUnique({ where: { providerType: "SAP_ACCOUNTING" } });
    const paymentSetting = await prisma.integrationSetting.findUnique({ where: { providerType: "PAYMENT_GATEWAY" } });
    const scannerSetting = await prisma.integrationSetting.findUnique({ where: { providerType: "BARCODE_RFID" } });

    const seedLogs = [
      {
        reference: "INT-STAGE16-SUCCESS",
        providerType: "SAP_ACCOUNTING",
        settingId: sapSetting?.id,
        action: "POST_ACCOUNTING_DOCUMENT",
        requestStatus: "SUCCESS",
        responseStatus: "SUCCESS",
        errorMessage: null,
        retryCount: 0,
        relatedRecord: "INV-STAGE10-SEED",
        payload: { invoice: "INV-STAGE10-SEED", amount: 1592 },
        responsePayload: { mock: true, accountingDocument: "SAP-MOCK-001" }
      },
      {
        reference: "INT-STAGE16-RETRY",
        providerType: "PAYMENT_GATEWAY",
        settingId: paymentSetting?.id,
        action: "PAYMENT_CALLBACK",
        requestStatus: "RETRY_QUEUED",
        responseStatus: "FAILED",
        errorMessage: "Seed mock callback failure queued for retry.",
        retryCount: 1,
        relatedRecord: "RCT-STAGE10-SEED",
        payload: { provider: "MPESA", transactionReference: "MPESA-STAGE10-SEED", amount: 800 },
        responsePayload: { queuedForRetry: true }
      },
      {
        reference: "INT-STAGE16-SCAN",
        providerType: "BARCODE_RFID",
        settingId: scannerSetting?.id,
        action: "SCAN_BARCODE_RFID",
        requestStatus: "SUCCESS",
        responseStatus: "SUCCESS",
        errorMessage: null,
        retryCount: 0,
        relatedRecord: "CYL-6KG-0001",
        payload: { scanValue: "RFID-6KG-0001" },
        responsePayload: { mock: true, matched: "CYL-6KG-0001" }
      }
    ] as const;

    for (const log of seedLogs) {
      await prisma.integrationLog.upsert({
        where: { reference: log.reference },
        update: { ...log, createdById: adminUser.id },
        create: { ...log, createdById: adminUser.id }
      });
    }

    const auditSeed = [
      { action: "MASTER_DATA_CHANGE_SEEDED", category: "MASTER_DATA", details: "Seed audit marker for master data change review.", entityType: "MasterDataRecord", entityId: "STAGE17-MASTER" },
      { action: "CUSTOMER_CHANGE_SEEDED", category: "CUSTOMER", details: "Seed audit marker for customer change review.", entityType: "Customer", entityId: "STAGE17-CUSTOMER" },
      { action: "INVENTORY_MOVEMENT_SEEDED", category: "INVENTORY", details: "Seed audit marker for inventory movement review.", entityType: "InventoryMovement", entityId: "STAGE17-INVENTORY" },
      { action: "APPROVAL_SEEDED", category: "APPROVAL", details: "Seed audit marker for approval review.", entityType: "Approval", entityId: "STAGE17-APPROVAL" },
      { action: "ORDER_CHANGE_SEEDED", category: "ORDER", details: "Seed audit marker for order change review.", entityType: "CustomerOrder", entityId: "STAGE17-ORDER" },
      { action: "DELIVERY_UPDATE_SEEDED", category: "DELIVERY", details: "Seed audit marker for delivery update review.", entityType: "Delivery", entityId: "STAGE17-DELIVERY" },
      { action: "INVOICE_ISSUED_SEEDED", category: "BILLING", details: "Seed audit marker for invoice review.", entityType: "Invoice", entityId: "STAGE17-INVOICE" },
      { action: "PAYMENT_RECORDED_SEEDED", category: "PAYMENT", details: "Seed audit marker for payment review.", entityType: "BillingPayment", entityId: "STAGE17-PAYMENT" },
      { action: "RECONCILIATION_REVIEW_SEEDED", category: "RECONCILIATION", details: "Seed audit marker for reconciliation review.", entityType: "DailyReconciliation", entityId: "STAGE17-RECON" },
      { action: "COMPLIANCE_CASE_SEEDED", category: "COMPLIANCE", details: "Seed audit marker for compliance case review.", entityType: "MaintenanceCase", entityId: "STAGE17-COMPLIANCE" }
    ] as const;

    for (const log of auditSeed) {
      const existing = await prisma.auditLog.findFirst({ where: { action: log.action, entityId: log.entityId } });
      if (!existing) {
        await prisma.auditLog.create({
          data: {
            ...log,
            severity: log.category === "COMPLIANCE" ? "WARNING" : "INFO",
            userId: adminUser.id,
            metadata: { seededForStage: 17 }
          }
        });
      }
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
