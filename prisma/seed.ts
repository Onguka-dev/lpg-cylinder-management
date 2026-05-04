import { createHash } from "node:crypto";
import { PrismaClient, RoleName, LocationType } from "@prisma/client";

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
