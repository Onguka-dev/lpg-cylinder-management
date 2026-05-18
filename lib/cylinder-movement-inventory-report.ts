import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dateRange, formatReportLabel, type ReportFilters } from "@/lib/reports";

export const cylinderMovementInventoryTabs = [
  "cylinder-transfers",
  "sales-by-cylinder",
  "stock-levels",
  "customer-custody",
  "in-transit",
  "variance-loss",
  "empty-returns"
] as const;

export type CylinderMovementInventoryTab = (typeof cylinderMovementInventoryTabs)[number];

export type CylinderReportRow = {
  id: string;
  href?: string;
  cylinderHref?: string;
  cells: Record<string, string>;
};

export type CylinderMovementInventoryReport = {
  tab: CylinderMovementInventoryTab;
  columns: string[];
  rows: CylinderReportRow[];
  kpis: {
    totalTransfers: number;
    fullCylindersMoved: number;
    emptyCylindersMoved: number;
    withCustomer: number;
    inTransit: number;
    damagedQuarantined: number;
    uniqueCylinderTypes: number;
  };
};

const fullStatuses = ["FILLED", "FILLED_AT_WAREHOUSE", "FILLED_AT_SELLING_POINT", "FILLED_IN_TRANSIT", "WITH_CUSTOMER"];
const emptyStatuses = ["EMPTY", "EMPTY_AT_WAREHOUSE", "EMPTY_AT_SELLING_POINT", "EMPTY_IN_TRANSIT"];
const inTransitStatuses = ["IN_TRANSIT", "EMPTY_IN_TRANSIT", "FILLED_IN_TRANSIT"];
const damagedStatuses = ["DAMAGED", "QUARANTINED", "UNDER_MAINTENANCE", "SCRAPPED_WRITTEN_OFF", "LOST_OVERDUE"];
const cylinderStatuses = [...fullStatuses, ...emptyStatuses, ...damagedStatuses, "IN_TRANSIT", "RESERVED"];

export function normalizeCylinderReportTab(value?: string | null): CylinderMovementInventoryTab {
  return cylinderMovementInventoryTabs.includes(value as CylinderMovementInventoryTab)
    ? (value as CylinderMovementInventoryTab)
    : "cylinder-transfers";
}

export function formatCylinderReportTab(tab: string) {
  if (tab === "variance-loss") return "Variance/Loss";
  return formatReportLabel(tab);
}

export function cylinderReportExportRows(report: CylinderMovementInventoryReport) {
  return report.rows.map((row) => row.cells);
}

export async function getCylinderMovementInventoryReport(filters: ReportFilters): Promise<CylinderMovementInventoryReport> {
  const tab = normalizeCylinderReportTab(filters.tab);
  const [kpis, table] = await Promise.all([getKpis(filters), getRowsForTab(tab, filters)]);
  return { tab, ...table, kpis };
}

async function getKpis(filters: ReportFilters) {
  const movementWhere = movementFilters(filters);
  const cylinderWhere = cylinderFilters(filters);
  const [totalTransfers, fullCylindersMoved, emptyCylindersMoved, withCustomer, inTransit, damagedQuarantined, cylinderTypes] = await Promise.all([
    prisma.inventoryMovement.count({ where: movementWhere }),
    prisma.inventoryMovementCylinder.count({ where: { movement: movementWhere, cylinder: { status: { in: fullStatuses as never[] } } } }),
    prisma.inventoryMovementCylinder.count({ where: { movement: movementWhere, cylinder: { status: { in: emptyStatuses as never[] } } } }),
    prisma.cylinder.count({ where: { ...cylinderWhere, status: "WITH_CUSTOMER" } }),
    prisma.cylinder.count({ where: { ...cylinderWhere, status: { in: inTransitStatuses as never[] } } }),
    prisma.cylinder.count({ where: { ...cylinderWhere, OR: [{ status: { in: damagedStatuses as never[] } }, { unsafeStatus: true }, { quarantinedStatus: true }] } }),
    prisma.cylinder.groupBy({ by: ["cylinderSizeKg"], where: cylinderWhere, _count: { _all: true } })
  ]);

  return {
    totalTransfers,
    fullCylindersMoved,
    emptyCylindersMoved,
    withCustomer,
    inTransit,
    damagedQuarantined,
    uniqueCylinderTypes: cylinderTypes.filter((row) => row.cylinderSizeKg !== null).length
  };
}

async function getRowsForTab(tab: CylinderMovementInventoryTab, filters: ReportFilters) {
  if (tab === "sales-by-cylinder") return salesRows(filters);
  if (tab === "stock-levels") return stockRows(filters);
  if (tab === "customer-custody") return custodyRows(filters);
  if (tab === "in-transit") return inTransitRows(filters);
  if (tab === "variance-loss") return varianceRows(filters);
  if (tab === "empty-returns") return emptyReturnRows(filters);
  return transferRows(filters);
}

function movementFilters(filters: ReportFilters): Prisma.InventoryMovementWhereInput {
  const createdAt = dateRange(filters);
  const and: Prisma.InventoryMovementWhereInput[] = [];
  if (filters.locationId) and.push({ OR: [{ sourceLocationId: filters.locationId }, { destinationLocationId: filters.locationId }] });
  if (filters.salesPersonId) and.push({ OR: [{ requestedById: filters.salesPersonId }, { dispatchedById: filters.salesPersonId }, { receivedById: filters.salesPersonId }] });
  if (filters.barcode) and.push({ cylinders: { some: { cylinder: barcodeFilter(filters.barcode) } } });

  return {
    ...(createdAt ? { createdAt } : {}),
    ...(filters.skuId ? { skuId: filters.skuId } : {}),
    ...(filters.sourceId ? { sourceLocationId: filters.sourceId } : {}),
    ...(filters.destinationId ? { destinationLocationId: filters.destinationId } : {}),
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(and.length ? { AND: and } : {})
  };
}

function cylinderFilters(filters: ReportFilters) {
  return {
    ...(filters.skuId ? { skuId: filters.skuId } : {}),
    ...(filters.locationId ? { currentLocationId: filters.locationId } : {}),
    ...(cylinderStatuses.includes(filters.status ?? "") ? { status: filters.status as never } : {}),
    ...(filters.barcode ? barcodeFilter(filters.barcode) : {})
  };
}

function barcodeFilter(value: string) {
  const query = value.trim();
  return {
    OR: [
      { serialNumber: { contains: query, mode: "insensitive" as const } },
      { barcode: { contains: query, mode: "insensitive" as const } },
      { factorySerialNo: { contains: query, mode: "insensitive" as const } },
      { qrCode: { contains: query, mode: "insensitive" as const } }
    ]
  };
}

function entityAllowed(filters: ReportFilters, entity: string) {
  return !filters.entityType || filters.entityType === entity;
}

async function transferRows(filters: ReportFilters) {
  const columns = ["Date", "Transfer", "Source", "Destination", "SKU", "Status", "Qty", "Cylinder"];
  if (!entityAllowed(filters, "transfer")) return { columns, rows: [] };
  const movements = await prisma.inventoryMovement.findMany({
    where: movementFilters(filters),
    include: {
      sku: true,
      sourceLocation: true,
      destinationLocation: true,
      cylinders: { include: { cylinder: true }, take: 3 }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return {
    columns,
    rows: movements.map((movement) => {
      const firstCylinder = movement.cylinders[0]?.cylinder;
      return {
        id: movement.id,
        href: `/inventory/movements/${movement.id}`,
        cylinderHref: firstCylinder ? `/inventory/cylinders/${firstCylinder.id}` : undefined,
        cells: {
          Date: formatDate(movement.createdAt),
          Transfer: movement.reference,
          Source: movement.sourceLocation?.name ?? "Direct receipt",
          Destination: movement.destinationLocation?.name ?? "No destination",
          SKU: movement.sku.name,
          Status: formatReportLabel(movement.status),
          Qty: String(movement.receivedQuantity ?? movement.dispatchedQuantity ?? movement.approvedQuantity ?? movement.requestedQuantity),
          Cylinder: firstCylinder ? cylinderLabel(firstCylinder) : "Batch only"
        }
      };
    })
  };
}

async function salesRows(filters: ReportFilters) {
  const columns = ["Date", "Sale", "Type", "Customer", "Location", "SKU", "Cylinder", "Sales Person"];
  if (!entityAllowed(filters, "sale")) return { columns, rows: [] };
  const createdAt = dateRange(filters);
  const cylinderWhere = filters.barcode ? barcodeFilter(filters.barcode) : {};
  const [fullSales, refills, fieldSales] = await Promise.all([
    prisma.fullCylinderSale.findMany({
      where: {
        ...(createdAt ? { createdAt } : {}),
        ...(filters.skuId ? { skuId: filters.skuId } : {}),
        ...(filters.locationId ? { locationId: filters.locationId } : {}),
        ...(filters.customerId ? { customerId: filters.customerId } : {}),
        ...(filters.salesPersonId ? { createdById: filters.salesPersonId } : {}),
        ...(filters.barcode ? { cylinder: cylinderWhere } : {})
      },
      include: { customer: true, location: true, sku: true, cylinder: true, createdBy: true },
      take: 100
    }),
    prisma.refillOrder.findMany({
      where: {
        ...(createdAt ? { createdAt } : {}),
        ...(filters.skuId ? { skuId: filters.skuId } : {}),
        ...(filters.locationId ? { locationId: filters.locationId } : {}),
        ...(filters.customerId ? { customerId: filters.customerId } : {}),
        ...(filters.salesPersonId ? { createdById: filters.salesPersonId } : {}),
        ...(filters.barcode ? { OR: [{ filledCylinder: cylinderWhere }, { emptyReturnCylinder: cylinderWhere }] } : {})
      },
      include: { customer: true, location: true, sku: true, filledCylinder: true, emptyReturnCylinder: true, createdBy: true },
      take: 100
    }),
    prisma.fieldSale.findMany({
      where: {
        ...(createdAt ? { createdAt } : {}),
        ...(filters.skuId ? { skuId: filters.skuId } : {}),
        ...(filters.locationId ? { vehicleId: filters.locationId } : {}),
        ...(filters.customerId ? { customerId: filters.customerId } : {}),
        ...(filters.salesPersonId ? { createdById: filters.salesPersonId } : {}),
        ...(filters.barcode ? { OR: [{ filledCylinder: cylinderWhere }, { emptyReturnCylinder: cylinderWhere }] } : {})
      },
      include: { customer: true, vehicle: true, sku: true, filledCylinder: true, emptyReturnCylinder: true, createdBy: true },
      take: 100
    })
  ]);

  const rows: CylinderReportRow[] = [
    ...fullSales.map((sale) => saleRow(sale.id, `/retail-sales/full-cylinder-sales/${sale.id}`, sale.createdAt, sale.saleNumber, "Full Cylinder + Gas", sale.customer.name, sale.location.name, sale.sku.name, sale.cylinder, sale.createdBy?.name ?? "System")),
    ...refills.map((sale) => saleRow(sale.id, `/retail-sales/refills/${sale.id}`, sale.createdAt, sale.orderNumber, "Refill Exchange", sale.customer.name, sale.location.name, sale.sku.name, sale.filledCylinder, sale.createdBy?.name ?? "System")),
    ...fieldSales.map((sale) => saleRow(sale.id, `/field-sales/sales/${sale.id}`, sale.createdAt, sale.saleNumber, "Field Sale", sale.customer.name, sale.vehicle.name, sale.sku.name, sale.filledCylinder, sale.createdBy?.name ?? "System"))
  ].sort((a, b) => b.cells.Date.localeCompare(a.cells.Date)).slice(0, 100);

  return { columns, rows };
}

async function stockRows(filters: ReportFilters) {
  const columns = ["Location", "Size", "Status", "Closing Stock", "Cylinder"];
  if (!entityAllowed(filters, "stock")) return { columns, rows: [] };
  const where = cylinderFilters(filters);
  const [stock, sampleCylinders] = await Promise.all([
    prisma.cylinder.groupBy({
      by: ["currentLocationId", "cylinderSizeKg", "status"],
      where,
      _count: { _all: true },
      orderBy: [{ currentLocationId: "asc" }, { cylinderSizeKg: "asc" }, { status: "asc" }]
    }),
    prisma.cylinder.findMany({ where, select: { id: true, serialNumber: true, barcode: true, currentLocationId: true, cylinderSizeKg: true, status: true }, orderBy: { updatedAt: "desc" }, take: 500 })
  ]);
  const locations = await prisma.masterDataRecord.findMany({ where: { id: { in: stock.map((row) => row.currentLocationId) } }, select: { id: true, name: true } });
  const locationById = new Map(locations.map((location) => [location.id, location.name]));
  const sampleByKey = new Map(sampleCylinders.map((cylinder) => [stockKey(cylinder.currentLocationId, cylinder.cylinderSizeKg, cylinder.status), cylinder]));

  return {
    columns,
    rows: stock.map((row) => {
      const sample = sampleByKey.get(stockKey(row.currentLocationId, row.cylinderSizeKg, row.status));
      return {
        id: stockKey(row.currentLocationId, row.cylinderSizeKg, row.status),
        cylinderHref: sample ? `/inventory/cylinders/${sample.id}` : undefined,
        cells: {
          Location: locationById.get(row.currentLocationId) ?? "Unknown",
          Size: row.cylinderSizeKg ? `${row.cylinderSizeKg}kg` : "Unspecified",
          Status: formatReportLabel(row.status),
          "Closing Stock": String(row._count._all),
          Cylinder: sample ? cylinderLabel(sample) : "No sample"
        }
      };
    })
  };
}

async function custodyRows(filters: ReportFilters) {
  const columns = ["Issue Date", "Customer", "Cylinder", "SKU", "Issue Location", "Expected Return", "Return Date", "Status"];
  if (!entityAllowed(filters, "custody")) return { columns, rows: [] };
  const createdAt = dateRange(filters);
  const custodies = await prisma.customerCylinderCustody.findMany({
    where: {
      ...(createdAt ? { issueDate: createdAt } : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.locationId ? { OR: [{ issueLocationId: filters.locationId }, { returnLocationId: filters.locationId }] } : {}),
      ...(filters.sourceId ? { issueLocationId: filters.sourceId } : {}),
      ...(filters.destinationId ? { returnLocationId: filters.destinationId } : {}),
      ...(filters.skuId ? { cylinder: { skuId: filters.skuId } } : {}),
      ...(filters.status === "OPEN" ? { returnDate: null } : {}),
      ...(filters.status === "RETURNED" ? { returnDate: { not: null } } : {}),
      ...(filters.barcode ? { cylinder: barcodeFilter(filters.barcode) } : {})
    },
    include: { customer: true, cylinder: { include: { sku: true } }, issueLocation: true, returnLocation: true },
    orderBy: { issueDate: "desc" },
    take: 100
  });

  return {
    columns,
    rows: custodies.map((custody) => ({
      id: custody.id,
      href: `/customers/${custody.customerId}`,
      cylinderHref: `/inventory/cylinders/${custody.cylinderId}`,
      cells: {
        "Issue Date": formatDate(custody.issueDate),
        Customer: custody.customer.name,
        Cylinder: cylinderLabel(custody.cylinder),
        SKU: custody.cylinder.sku.name,
        "Issue Location": custody.issueLocation?.name ?? "Unknown",
        "Expected Return": custody.expectedReturnFollowUpDate ? formatDate(custody.expectedReturnFollowUpDate) : "",
        "Return Date": custody.returnDate ? formatDate(custody.returnDate) : "",
        Status: custody.returnDate ? "Returned" : "With Customer"
      }
    }))
  };
}

async function inTransitRows(filters: ReportFilters) {
  const columns = ["Date", "Transfer", "Source", "Destination", "SKU", "Status", "Qty", "Cylinder"];
  if (!entityAllowed(filters, "transfer")) return { columns, rows: [] };
  const rows = await transferRows({ ...filters, status: "DISPATCHED" });
  return { columns, rows: rows.rows };
}

async function varianceRows(filters: ReportFilters) {
  const columns = ["Date", "Reference", "Type", "Status", "Variance", "Cylinder", "Reason"];
  if (!entityAllowed(filters, "variance")) return { columns, rows: [] };
  const createdAt = dateRange(filters);
  const [movements, plantCases, lostCylinders] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where: { ...movementFilters(filters), varianceQuantity: { not: 0 } },
      include: { cylinders: { include: { cylinder: true }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.plantVarianceCase.findMany({
      where: {
        ...(createdAt ? { createdAt } : {}),
        ...(filters.status ? { status: filters.status as never } : {}),
        ...(filters.barcode ? { cylinder: barcodeFilter(filters.barcode) } : {})
      },
      include: { cylinder: true, transfer: true },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.cylinder.findMany({
      where: { ...cylinderFilters(filters), status: "LOST_OVERDUE" },
      orderBy: { updatedAt: "desc" },
      take: 100
    })
  ]);

  const rows: CylinderReportRow[] = [
    ...movements.map((movement) => {
      const firstCylinder = movement.cylinders[0]?.cylinder;
      return {
        id: movement.id,
        href: `/inventory/movements/${movement.id}`,
        cylinderHref: firstCylinder ? `/inventory/cylinders/${firstCylinder.id}` : undefined,
        cells: {
          Date: formatDate(movement.createdAt),
          Reference: movement.reference,
          Type: "Movement variance",
          Status: formatReportLabel(movement.status),
          Variance: String(movement.varianceQuantity ?? 0),
          Cylinder: firstCylinder ? cylinderLabel(firstCylinder) : "Batch variance",
          Reason: movement.varianceReason ?? ""
        }
      };
    }),
    ...plantCases.map((item) => ({
      id: item.id,
      href: `/inventory/plant-transfers/${item.transferId}`,
      cylinderHref: item.cylinder ? `/inventory/cylinders/${item.cylinder.id}` : undefined,
      cells: {
        Date: formatDate(item.createdAt),
        Reference: item.reference,
        Type: formatReportLabel(item.type),
        Status: formatReportLabel(item.status),
        Variance: "1",
        Cylinder: item.cylinder ? cylinderLabel(item.cylinder) : "No cylinder",
        Reason: item.details
      }
    })),
    ...lostCylinders.map((cylinder) => ({
      id: cylinder.id,
      href: `/inventory/cylinders/${cylinder.id}`,
      cylinderHref: `/inventory/cylinders/${cylinder.id}`,
      cells: {
        Date: formatDate(cylinder.updatedAt),
        Reference: cylinder.serialNumber,
        Type: "Lost/overdue",
        Status: formatReportLabel(cylinder.status),
        Variance: "1",
        Cylinder: cylinderLabel(cylinder),
        Reason: cylinder.blockedReason ?? ""
      }
    }))
  ].sort((a, b) => b.cells.Date.localeCompare(a.cells.Date)).slice(0, 100);

  return { columns, rows };
}

async function emptyReturnRows(filters: ReportFilters) {
  const columns = ["Date", "Reference", "Source", "Destination", "SKU", "Status", "Qty", "Cylinder"];
  if (!entityAllowed(filters, "return")) return { columns, rows: [] };
  const movementWhere = movementFilters(filters);
  const createdAt = dateRange(filters);
  const [movements, custodies] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where: {
        ...movementWhere,
        OR: [
          { type: { in: ["RETURN_FROM_CUSTOMER", "RETURN_FROM_VEHICLE"] as never[] } },
          { sourceStatus: { in: emptyStatuses as never[] } },
          { destinationStatus: { in: emptyStatuses as never[] } }
        ]
      },
      include: { sku: true, sourceLocation: true, destinationLocation: true, cylinders: { include: { cylinder: true }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.customerCylinderCustody.findMany({
      where: {
        ...(createdAt ? { returnDate: createdAt } : { returnDate: { not: null } }),
        ...(filters.customerId ? { customerId: filters.customerId } : {}),
        ...(filters.locationId ? { returnLocationId: filters.locationId } : {}),
        ...(filters.skuId ? { cylinder: { skuId: filters.skuId } } : {}),
        ...(filters.barcode ? { cylinder: barcodeFilter(filters.barcode) } : {})
      },
      include: { cylinder: { include: { sku: true } }, issueLocation: true, returnLocation: true },
      orderBy: { returnDate: "desc" },
      take: 100
    })
  ]);

  const rows: CylinderReportRow[] = [
    ...movements.map((movement) => {
      const firstCylinder = movement.cylinders[0]?.cylinder;
      return {
        id: movement.id,
        href: `/inventory/movements/${movement.id}`,
        cylinderHref: firstCylinder ? `/inventory/cylinders/${firstCylinder.id}` : undefined,
        cells: {
          Date: formatDate(movement.createdAt),
          Reference: movement.reference,
          Source: movement.sourceLocation?.name ?? "Customer return",
          Destination: movement.destinationLocation?.name ?? "No destination",
          SKU: movement.sku.name,
          Status: formatReportLabel(movement.status),
          Qty: String(movement.receivedQuantity ?? movement.dispatchedQuantity ?? movement.requestedQuantity),
          Cylinder: firstCylinder ? cylinderLabel(firstCylinder) : "Batch return"
        }
      };
    }),
    ...custodies.map((custody) => ({
      id: custody.id,
      href: `/customers/${custody.customerId}`,
      cylinderHref: `/inventory/cylinders/${custody.cylinderId}`,
      cells: {
        Date: custody.returnDate ? formatDate(custody.returnDate) : "",
        Reference: custody.refillReference ?? custody.saleReference ?? custody.id,
        Source: custody.issueLocation?.name ?? "Customer",
        Destination: custody.returnLocation?.name ?? "Selling point",
        SKU: custody.cylinder.sku.name,
        Status: "Returned empty",
        Qty: "1",
        Cylinder: cylinderLabel(custody.cylinder)
      }
    }))
  ].sort((a, b) => b.cells.Date.localeCompare(a.cells.Date)).slice(0, 100);

  return { columns, rows };
}

function saleRow(id: string, href: string, createdAt: Date, reference: string, type: string, customer: string, location: string, sku: string, cylinder: { id: string; serialNumber: string; barcode: string | null }, salesPerson: string): CylinderReportRow {
  return {
    id,
    href,
    cylinderHref: `/inventory/cylinders/${cylinder.id}`,
    cells: {
      Date: formatDate(createdAt),
      Sale: reference,
      Type: type,
      Customer: customer,
      Location: location,
      SKU: sku,
      Cylinder: cylinderLabel(cylinder),
      "Sales Person": salesPerson
    }
  };
}

function cylinderLabel(cylinder: { serialNumber: string; barcode: string | null }) {
  return cylinder.barcode ? `${cylinder.serialNumber} / ${cylinder.barcode}` : cylinder.serialNumber;
}

function stockKey(locationId: string, size: number | null, status: string) {
  return `${locationId}:${size ?? "none"}:${status}`;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
