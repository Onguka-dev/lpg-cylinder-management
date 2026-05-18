import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { formatMoney } from "@/lib/billing";
import { cylinderReportExportRows, getCylinderMovementInventoryReport } from "@/lib/cylinder-movement-inventory-report";
import { prisma } from "@/lib/prisma";
import { canViewReports, dateRange, normalizeReportFilters, reportTypes, toCsv, type ReportType } from "@/lib/reports";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to export reports." }, { status: 401 });
  if (!canViewReports(session.user.role)) return NextResponse.json({ error: "Your role cannot export reports." }, { status: 403 });

  const url = new URL(request.url);
  const type = url.searchParams.get("type") as ReportType | null;
  if (!type || !reportTypes.includes(type)) {
    return NextResponse.json({ error: "Select a valid report type." }, { status: 400 });
  }

  const filters = normalizeReportFilters(Object.fromEntries(url.searchParams.entries()));
  const rows = await reportRows(type, filters);
  const csv = toCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}

async function reportRows(type: ReportType, filters: ReturnType<typeof normalizeReportFilters>) {
  const createdAt = dateRange(filters);

  if (type === "cylinder-movement-inventory") {
    const report = await getCylinderMovementInventoryReport(filters);
    return cylinderReportExportRows(report);
  }

  if (type === "stock-report" || type === "inventory-levels" || type === "cylinder-status" || type === "cylinder-location") {
    const cylinders = await prisma.cylinder.findMany({
      where: {
        ...(filters.skuId ? { skuId: filters.skuId } : {}),
        ...(filters.locationId ? { currentLocationId: filters.locationId } : {}),
        ...(cylinderStatuses.includes(filters.status ?? "") ? { status: filters.status as never } : {})
      },
      include: { sku: true, currentLocation: true },
      orderBy: { updatedAt: "desc" },
      take: 500
    });
    return cylinders.map((cylinder) => ({
      serialNumber: cylinder.serialNumber,
      sku: cylinder.sku.name,
      location: cylinder.currentLocation.name,
      status: cylinder.status,
      expiryDate: cylinder.expiryDate?.toISOString().slice(0, 10) ?? "",
      hydroTestDueDate: cylinder.hydroTestDueDate?.toISOString().slice(0, 10) ?? "",
      unsafe: cylinder.unsafeStatus,
      quarantined: cylinder.quarantinedStatus
    }));
  }

  if (type === "customer-custody-report" && filters.status === "OVERDUE") {
    const custodies = await prisma.customerCylinderCustody.findMany({
      where: {
        returnDate: null,
        expectedReturnFollowUpDate: { lt: new Date() },
        ...(filters.skuId ? { cylinder: { skuId: filters.skuId } } : {}),
        ...(filters.locationId ? { issueLocationId: filters.locationId } : {})
      },
      include: { customer: true, cylinder: { include: { sku: true, currentLocation: true } }, issueLocation: true, returnLocation: true },
      orderBy: { expectedReturnFollowUpDate: "asc" },
      take: 500
    });
    return custodies.map((custody) => ({
      customer: custody.customer.name,
      customerPhone: custody.customer.phone,
      cylinder: custody.cylinder.serialNumber,
      barcode: custody.cylinder.barcode ?? "",
      sku: custody.cylinder.sku.name,
      currentStatus: custody.cylinder.status,
      currentLocation: custody.cylinder.currentLocation.name,
      custodyStatus: "OVERDUE",
      issueLocation: custody.issueLocation?.name ?? "",
      issueDate: custody.issueDate.toISOString().slice(0, 10),
      expectedReturn: custody.expectedReturnFollowUpDate?.toISOString().slice(0, 10) ?? "",
      returnLocation: "",
      returnDate: "",
      reference: custody.refillReference ?? custody.saleReference ?? ""
    }));
  }

  if (type === "customer-custody-report" && filters.status === "DUE_REFILL_FOLLOW_UP") {
    const dueTo = new Date();
    dueTo.setDate(dueTo.getDate() + 7);
    const custodies = await prisma.customerCylinderCustody.findMany({
      where: {
        returnDate: null,
        expectedReturnFollowUpDate: { gte: new Date(), lte: dueTo },
        ...(filters.skuId ? { cylinder: { skuId: filters.skuId } } : {}),
        ...(filters.locationId ? { issueLocationId: filters.locationId } : {})
      },
      include: { customer: true, cylinder: { include: { sku: true, currentLocation: true } }, issueLocation: true, returnLocation: true },
      orderBy: { expectedReturnFollowUpDate: "asc" },
      take: 500
    });
    return custodyRows(custodies, "DUE_REFILL_FOLLOW_UP");
  }

  if (type === "customer-custody-report" && filters.status === "INACTIVE_WITH_CYLINDERS") {
    const custodies = await prisma.customerCylinderCustody.findMany({
      where: {
        returnDate: null,
        customer: { status: { not: "ACTIVE" } },
        ...(filters.skuId ? { cylinder: { skuId: filters.skuId } } : {}),
        ...(filters.locationId ? { issueLocationId: filters.locationId } : {})
      },
      include: { customer: true, cylinder: { include: { sku: true, currentLocation: true } }, issueLocation: true, returnLocation: true },
      orderBy: { issueDate: "desc" },
      take: 500
    });
    return custodyRows(custodies, "INACTIVE_WITH_CYLINDERS");
  }

  if (type === "customer-custody-report" && filters.status === "HIGH_FREQUENCY") {
    const start = new Date();
    start.setDate(start.getDate() - 90);
    const [refills, fullSales] = await Promise.all([
      prisma.refillOrder.groupBy({ by: ["customerId"], where: { createdAt: { gte: start } }, _count: { _all: true } }),
      prisma.fullCylinderSale.groupBy({ by: ["customerId"], where: { createdAt: { gte: start } }, _count: { _all: true } })
    ]);
    const counts = new Map<string, number>();
    for (const row of refills) counts.set(row.customerId, (counts.get(row.customerId) ?? 0) + row._count._all);
    for (const row of fullSales) counts.set(row.customerId, (counts.get(row.customerId) ?? 0) + row._count._all);
    const highFrequencyIds = Array.from(counts.entries()).filter(([, count]) => count >= 3).map(([customerId]) => customerId);
    const custodies = await prisma.customerCylinderCustody.findMany({
      where: {
        customerId: { in: highFrequencyIds },
        ...(filters.skuId ? { cylinder: { skuId: filters.skuId } } : {}),
        ...(filters.locationId ? { OR: [{ issueLocationId: filters.locationId }, { returnLocationId: filters.locationId }] } : {})
      },
      include: { customer: true, cylinder: { include: { sku: true, currentLocation: true } }, issueLocation: true, returnLocation: true },
      orderBy: { issueDate: "desc" },
      take: 500
    });
    return custodyRows(custodies, "HIGH_FREQUENCY", counts);
  }

  if (type === "customer-custody-report") {
    const custodies = await prisma.customerCylinderCustody.findMany({
      where: {
        ...(createdAt ? { issueDate: createdAt } : {}),
        ...(filters.skuId ? { cylinder: { skuId: filters.skuId } } : {}),
        ...(filters.locationId ? { OR: [{ issueLocationId: filters.locationId }, { returnLocationId: filters.locationId }] } : {}),
        ...(filters.status === "OPEN" ? { returnDate: null } : {}),
        ...(filters.status === "RETURNED" ? { returnDate: { not: null } } : {})
      },
      include: {
        customer: true,
        cylinder: { include: { sku: true, currentLocation: true } },
        issueLocation: true,
        returnLocation: true
      },
      orderBy: { issueDate: "desc" },
      take: 500
    });

    return custodyRows(custodies);
  }

  if (type === "nairobi-service-centre-stock") {
    const stock = await prisma.cylinder.groupBy({
      by: ["currentLocationId", "cylinderSizeKg", "status"],
      where: {
        currentLocation: {
          code: { in: ["SC-GARDEN-ESTATE", "SC-JOGOO-ROAD", "SC-NAIROBI-WEST", "SC-DAGORETTI", "SC-MLOLONGO"] }
        },
        ...(filters.skuId ? { skuId: filters.skuId } : {}),
        ...(filters.locationId ? { currentLocationId: filters.locationId } : {}),
        ...(cylinderStatuses.includes(filters.status ?? "") ? { status: filters.status as never } : {})
      },
      _count: { _all: true },
      orderBy: [{ currentLocationId: "asc" }, { cylinderSizeKg: "asc" }, { status: "asc" }]
    });
    const locations = await prisma.masterDataRecord.findMany({
      where: { id: { in: stock.map((row) => row.currentLocationId) } },
      select: { id: true, code: true, name: true }
    });
    const locationById = new Map(locations.map((location) => [location.id, location]));

    return stock.map((row) => ({
      centreCode: locationById.get(row.currentLocationId)?.code ?? "",
      centre: locationById.get(row.currentLocationId)?.name ?? "",
      cylinderSizeKg: row.cylinderSizeKg ?? "",
      status: row.status,
      quantity: row._count._all
    }));
  }

  if (type === "non-coded-tagging-queue") {
    const intakes = await prisma.nonCodedCylinderIntake.findMany({
      where: {
        ...(createdAt ? { createdAt } : {}),
        ...(filters.status ? { status: filters.status as never } : {}),
        ...(filters.locationId ? { intakeLocationId: filters.locationId } : {}),
        ...(filters.skuId ? { linkedCylinder: { skuId: filters.skuId } } : {})
      },
      include: { customer: true, intakeLocation: true, linkedCylinder: true, reviewedBy: true },
      orderBy: { createdAt: "desc" },
      take: 500
    });
    return intakes.map((intake) => ({
      intakeNumber: intake.intakeNumber,
      customer: intake.customer.name,
      customerPhone: intake.customer.phone,
      visibleSerialNumber: intake.visibleSerialNumber,
      cylinderSizeKg: intake.cylinderSizeKg,
      manufacturer: intake.manufacturer ?? "",
      condition: intake.condition,
      intakeLocation: intake.intakeLocation.name,
      status: intake.status,
      linkedCylinder: intake.linkedCylinder?.serialNumber ?? "",
      approvedBarcode: intake.approvedBarcode ?? "",
      reviewedBy: intake.reviewedBy?.name ?? "",
      createdAt: intake.createdAt.toISOString(),
      reviewedAt: intake.reviewedAt?.toISOString() ?? "",
      reviewNotes: intake.reviewNotes ?? ""
    }));
  }

  if (type === "sales-revenue") {
    const [refills, fieldSales, payments] = await Promise.all([
      prisma.refillOrder.findMany({ where: { ...(createdAt ? { createdAt } : {}), ...(filters.skuId ? { skuId: filters.skuId } : {}), ...(filters.locationId ? { locationId: filters.locationId } : {}) }, include: { customer: true, sku: true, location: true }, take: 500 }),
      prisma.fieldSale.findMany({ where: { ...(createdAt ? { createdAt } : {}), ...(filters.skuId ? { skuId: filters.skuId } : {}), ...(filters.locationId ? { vehicleId: filters.locationId } : {}) }, include: { customer: true, sku: true, vehicle: true }, take: 500 }),
      prisma.billingPayment.findMany({ where: { ...(createdAt ? { createdAt } : {}) }, include: { customer: true, invoice: true }, take: 500 })
    ]);
    return [
      ...refills.map((sale) => ({ source: "Retail refill", reference: sale.orderNumber, customer: sale.customer.name, sku: sale.sku.name, location: sale.location.name, amount: formatMoney(sale.totalAmount), date: sale.createdAt.toISOString().slice(0, 10) })),
      ...fieldSales.map((sale) => ({ source: "Field sale", reference: sale.saleNumber, customer: sale.customer.name, sku: sale.sku.name, location: sale.vehicle.name, amount: formatMoney(sale.amount), date: sale.createdAt.toISOString().slice(0, 10) })),
      ...payments.map((payment) => ({ source: "Invoice payment", reference: payment.receiptNumber, customer: payment.customer.name, sku: "", location: "", amount: formatMoney(payment.amount), date: payment.createdAt.toISOString().slice(0, 10) }))
    ];
  }

  if (type === "outstanding-payments" || type === "customer-credit-limits") {
    const invoices = await prisma.invoice.findMany({ where: { ...(createdAt ? { createdAt } : {}), ...(invoiceStatuses.includes(filters.status ?? "") ? { status: filters.status as never } : {}) }, include: { customer: true }, orderBy: { balanceAmount: "desc" }, take: 500 });
    return invoices.map((invoice) => ({
      invoice: invoice.invoiceNumber,
      customer: invoice.customer.name,
      category: invoice.customer.category,
      creditLimit: formatMoney(invoice.customer.creditLimit),
      total: formatMoney(invoice.totalAmount),
      paid: formatMoney(invoice.amountPaid),
      balance: formatMoney(invoice.balanceAmount),
      status: invoice.status
    }));
  }

  if (type === "delivery-performance") {
    const deliveries = await prisma.delivery.findMany({ where: { ...(createdAt ? { createdAt } : {}), ...(deliveryStatuses.includes(filters.status ?? "") ? { status: filters.status as never } : {}), ...(filters.locationId ? { OR: [{ zoneId: filters.locationId }, { routeId: filters.locationId }, { vehicleId: filters.locationId }] } : {}) }, include: { order: { include: { customer: true } }, assignedUser: true, route: true, zone: true, vehicle: true }, take: 500 });
    return deliveries.map((delivery) => ({
      delivery: delivery.deliveryNumber,
      order: delivery.order.orderNumber,
      customer: delivery.order.customer.name,
      status: delivery.status,
      route: delivery.route?.name ?? "",
      zone: delivery.zone?.name ?? "",
      vehicle: delivery.vehicle?.name ?? "",
      assignedUser: delivery.assignedUser?.name ?? ""
    }));
  }

  if (type === "reconciliation-variances") {
    const records = await prisma.dailyReconciliation.findMany({ where: { ...(createdAt ? { reconciliationDate: createdAt } : {}), ...(reconciliationStatuses.includes(filters.status ?? "") ? { status: filters.status as never } : {}) }, include: { owner: { include: { role: true } }, location: true }, take: 500 });
    return records.map((record) => ({ reference: record.reference, owner: record.owner.name, role: record.owner.role.name, location: record.location?.name ?? "", stockVariance: record.stockVariance, paymentVariance: record.paymentVariance.toString(), status: record.status, date: record.reconciliationDate.toISOString().slice(0, 10) }));
  }

  if (type === "safety-compliance" || type === "maintenance-due" || type === "damaged-cylinders") {
    const cases = await prisma.maintenanceCase.findMany({ where: { ...(createdAt ? { createdAt } : {}), ...(maintenanceStatuses.includes(filters.status ?? "") ? { status: filters.status as never } : {}) }, include: { cylinder: { include: { sku: true, currentLocation: true } } }, take: 500 });
    return cases.map((item) => ({ caseNumber: item.caseNumber, cylinder: item.cylinder.serialNumber, sku: item.cylinder.sku.name, location: item.cylinder.currentLocation.name, caseStatus: item.status, inspectionResult: item.inspectionResult ?? "", unsafe: item.cylinder.unsafeStatus, quarantined: item.cylinder.quarantinedStatus, expiryDate: item.cylinder.expiryDate?.toISOString().slice(0, 10) ?? "", hydroTestDueDate: item.cylinder.hydroTestDueDate?.toISOString().slice(0, 10) ?? "" }));
  }

  if (type === "user-activity") {
    const logs = await prisma.auditLog.findMany({ where: { ...(createdAt ? { createdAt } : {}), ...(filters.role ? { user: { role: { name: filters.role as never } } } : {}) }, include: { user: { include: { role: true } } }, orderBy: { createdAt: "desc" }, take: 500 });
    return logs.map((log) => ({ date: log.createdAt.toISOString(), user: log.user?.name ?? "System", role: log.user?.role.name ?? "", action: log.action, details: log.details }));
  }

  const history = await prisma.cylinderHistory.findMany({ where: { ...(createdAt ? { createdAt } : {}) }, include: { cylinder: true, changedBy: true }, orderBy: { createdAt: "desc" }, take: 500 });
  return history.map((entry) => ({ date: entry.createdAt.toISOString(), cylinder: entry.cylinder.serialNumber, fromStatus: entry.previousStatus ?? "", toStatus: entry.newStatus, reason: entry.reason, changedBy: entry.changedBy?.name ?? "System" }));
}

type CustodyExportRecord = {
  customerId: string;
  customer: { name: string; phone: string };
  cylinder: { serialNumber: string; barcode: string | null; status: string; sku: { name: string }; currentLocation: { name: string } };
  issueLocation: { name: string } | null;
  returnLocation: { name: string } | null;
  issueDate: Date;
  expectedReturnFollowUpDate: Date | null;
  returnDate: Date | null;
  refillReference: string | null;
  saleReference: string | null;
};

function custodyRows(custodies: CustodyExportRecord[], statusOverride?: string, frequencyCounts?: Map<string, number>) {
  return custodies.map((custody) => ({
    customer: custody.customer.name,
    customerPhone: custody.customer.phone,
    cylinder: custody.cylinder.serialNumber,
    barcode: custody.cylinder.barcode ?? "",
    sku: custody.cylinder.sku.name,
    currentStatus: custody.cylinder.status,
    currentLocation: custody.cylinder.currentLocation.name,
    custodyStatus: statusOverride ?? (custody.returnDate ? "RETURNED" : "OPEN"),
    issueLocation: custody.issueLocation?.name ?? "",
    issueDate: custody.issueDate.toISOString().slice(0, 10),
    expectedReturn: custody.expectedReturnFollowUpDate?.toISOString().slice(0, 10) ?? "",
    returnLocation: custody.returnLocation?.name ?? "",
    returnDate: custody.returnDate?.toISOString().slice(0, 10) ?? "",
    reference: custody.refillReference ?? custody.saleReference ?? "",
    transactionCount90Days: frequencyCounts?.get(custody.customerId) ?? ""
  }));
}

const cylinderStatuses = ["FILLED", "EMPTY", "EMPTY_AT_SELLING_POINT", "EMPTY_AT_WAREHOUSE", "EMPTY_IN_TRANSIT", "FILLED_IN_TRANSIT", "FILLED_AT_WAREHOUSE", "FILLED_AT_SELLING_POINT", "DAMAGED", "IN_TRANSIT", "RESERVED", "UNDER_MAINTENANCE", "WITH_CUSTOMER", "QUARANTINED", "SCRAPPED_WRITTEN_OFF", "LOST_OVERDUE"];
const deliveryStatuses = ["ASSIGNED", "LOADING_CONFIRMED", "CUSTOMER_ARRIVAL", "DELIVERED", "FAILED", "RETURNED", "EXCEPTION"];
const invoiceStatuses = ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];
const reconciliationStatuses = ["DRAFT", "SUBMITTED", "APPROVED", "RETURNED"];
const maintenanceStatuses = ["OPEN", "INSPECTION_RECORDED", "QUARANTINED", "APPROVED_RETURN_TO_STOCK", "SCRAP_PLACEHOLDER", "CLOSED"];
