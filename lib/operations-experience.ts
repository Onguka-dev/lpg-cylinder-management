import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BellRing,
  ClipboardCheck,
  CreditCard,
  PackageCheck,
  ShieldAlert,
  Truck,
  UserPlus,
  Warehouse,
  Wrench
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export type OperationsActivity = {
  id: string;
  title: string;
  description: string;
  href: string;
  timestamp: Date;
  icon: LucideIcon;
  tone: "success" | "warning" | "danger" | "info" | "neutral" | "brand";
};

export type OperationsTaskAlert = {
  key: string;
  title: string;
  description: string;
  count: number;
  href: string;
  icon: LucideIcon;
  tone: "success" | "warning" | "danger" | "info" | "neutral" | "brand";
  status: string;
};

export async function getOperationsActivityFeed(take = 10): Promise<OperationsActivity[]> {
  const [movements, deliveries, payments, customers, maintenanceCases, complaints] = await Promise.all([
    prisma.inventoryMovement.findMany({
      include: { sku: true, sourceLocation: true, destinationLocation: true },
      orderBy: { updatedAt: "desc" },
      take
    }).catch(() => []),
    prisma.delivery.findMany({
      include: { order: { include: { customer: true } }, vehicle: true, zone: true },
      orderBy: { updatedAt: "desc" },
      take
    }).catch(() => []),
    prisma.billingPayment.findMany({
      include: { customer: true, invoice: true },
      orderBy: { createdAt: "desc" },
      take
    }).catch(() => []),
    prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      take
    }).catch(() => []),
    prisma.maintenanceCase.findMany({
      include: { cylinder: true },
      orderBy: { updatedAt: "desc" },
      take
    }).catch(() => []),
    prisma.customerComplaint.findMany({
      include: { customer: true },
      orderBy: { updatedAt: "desc" },
      take
    }).catch(() => [])
  ]);

  return [
    ...movements.map((movement): OperationsActivity => ({
      id: `movement-${movement.id}`,
      title: movement.type === "RECEIPT" ? "Warehouse receipt" : movement.type === "TRANSFER" ? "Stock transfer" : "Stock movement",
      description: `${movement.reference} · ${movement.sku.name} · ${movement.requestedQuantity} item(s) · ${movement.sourceLocation?.name ?? "Source"} to ${movement.destinationLocation?.name ?? "Destination"}`,
      href: `/inventory/movements/${movement.id}`,
      timestamp: movement.updatedAt,
      icon: movement.type === "RECEIPT" ? Warehouse : PackageCheck,
      tone: movement.status === "COMPLETED" || movement.status === "RECEIVED" ? "success" : movement.status === "REJECTED" ? "danger" : "warning"
    })),
    ...deliveries.map((delivery): OperationsActivity => ({
      id: `delivery-${delivery.id}`,
      title: delivery.status === "DELIVERED" ? "Delivery completed" : "Delivery update",
      description: `${delivery.deliveryNumber} · ${delivery.order.customer.name} · ${delivery.status.replace(/_/g, " ")}`,
      href: `/deliveries/${delivery.id}`,
      timestamp: delivery.updatedAt,
      icon: Truck,
      tone: delivery.status === "DELIVERED" ? "success" : delivery.status === "FAILED" || delivery.status === "EXCEPTION" ? "danger" : "info"
    })),
    ...payments.map((payment): OperationsActivity => ({
      id: `payment-${payment.id}`,
      title: "Payment received",
      description: `${payment.receiptNumber} · ${payment.customer.name} · ${payment.method} · ${Number(payment.amount).toLocaleString("en-KE")}`,
      href: `/payments/invoices/${payment.invoiceId}`,
      timestamp: payment.createdAt,
      icon: CreditCard,
      tone: payment.status === "PAID" ? "success" : "warning"
    })),
    ...customers.map((customer): OperationsActivity => ({
      id: `customer-${customer.id}`,
      title: "Customer registered",
      description: `${customer.name} · ${customer.phone} · ${customer.category.toLowerCase()}`,
      href: `/customers/${customer.id}`,
      timestamp: customer.createdAt,
      icon: UserPlus,
      tone: "brand"
    })),
    ...maintenanceCases.map((item): OperationsActivity => ({
      id: `maintenance-${item.id}`,
      title: "Maintenance movement",
      description: `${item.caseNumber} · ${item.cylinder.serialNumber} · ${item.status.replace(/_/g, " ")}`,
      href: `/safety/maintenance-cases/${item.id}`,
      timestamp: item.updatedAt,
      icon: Wrench,
      tone: item.status === "CLOSED" || item.status === "APPROVED_RETURN_TO_STOCK" ? "success" : "warning"
    })),
    ...complaints.map((complaint): OperationsActivity => ({
      id: `complaint-${complaint.id}`,
      title: "Complaint / escalation",
      description: `${complaint.complaintNumber} · ${complaint.customer?.name ?? "Walk-in customer"} · ${complaint.priority.toLowerCase()}`,
      href: "/retail-sales/complaints",
      timestamp: complaint.updatedAt,
      icon: BellRing,
      tone: complaint.priority === "CRITICAL" || complaint.priority === "HIGH" ? "danger" : "info"
    }))
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, take);
}

export async function getOperationsTaskAlerts(): Promise<OperationsTaskAlert[]> {
  const now = new Date();
  const [pendingVerification, lowStockReview, loadVehicles, maintenanceTasks, delayedDeliveries, failedInspectionItems, pendingSync] = await Promise.all([
    prisma.inventoryMovement.count({ where: { type: "RECEIPT", status: { in: ["REQUESTED", "APPROVED", "DISPATCHED", "VARIANCE_LOGGED"] } } }).catch(() => 0),
    prisma.masterDataRecord.count({ where: { type: "STOCK_THRESHOLD", isActive: true } }).catch(() => 0),
    prisma.delivery.count({ where: { status: { in: ["ASSIGNED", "LOADING_CONFIRMED"] } } }).catch(() => 0),
    prisma.maintenanceCase.count({ where: { status: { in: ["OPEN", "INSPECTION_RECORDED", "QUARANTINED"] } } }).catch(() => 0),
    prisma.delivery.count({
      where: {
        status: { in: ["ASSIGNED", "LOADING_CONFIRMED", "CUSTOMER_ARRIVAL", "EXCEPTION"] },
        order: { expectedDeliveryDate: { lt: now } }
      }
    }).catch(() => 0),
    prisma.maintenanceCase.count({ where: { inspectionResult: { in: ["FAILED", "UNSAFE", "NEEDS_HYDRO_TEST"] } } }).catch(() => 0),
    prisma.offlineSyncItem.count({ where: { status: { in: ["QUEUED", "FAILED", "CONFLICT"] } } }).catch(() => 0)
  ]);

  return [
    {
      key: "pending-verification",
      title: "Pending verification",
      description: "Incoming batches waiting for receipt or quality review.",
      count: pendingVerification,
      href: "/warehouse/mobile/incoming",
      icon: ClipboardCheck,
      tone: pendingVerification ? "warning" : "success",
      status: pendingVerification ? "Pending" : "Clear"
    },
    {
      key: "low-stock-review",
      title: "Low stock review",
      description: "Configured threshold controls that need routine review.",
      count: lowStockReview,
      href: "/reports",
      icon: AlertTriangle,
      tone: lowStockReview ? "warning" : "neutral",
      status: lowStockReview ? "Review" : "No controls"
    },
    {
      key: "load-vehicles",
      title: "Load vehicles",
      description: "Assigned/loading deliveries still in the dispatch queue.",
      count: loadVehicles,
      href: "/warehouse/mobile/dispatch",
      icon: Truck,
      tone: loadVehicles ? "info" : "success",
      status: loadVehicles ? "In progress" : "Clear"
    },
    {
      key: "maintenance-tasks",
      title: "Maintenance tasks",
      description: "Open inspection, quarantine, or return-to-stock work.",
      count: maintenanceTasks,
      href: "/safety",
      icon: Wrench,
      tone: maintenanceTasks ? "warning" : "success",
      status: maintenanceTasks ? "In progress" : "Clear"
    },
    {
      key: "delayed-deliveries",
      title: "Delayed deliveries",
      description: "Open deliveries past expected delivery date.",
      count: delayedDeliveries,
      href: "/deliveries",
      icon: Truck,
      tone: delayedDeliveries ? "danger" : "success",
      status: delayedDeliveries ? "Delayed" : "On track"
    },
    {
      key: "failed-inspections",
      title: "Failed inspection items",
      description: "Unsafe, failed, or hydro-test-required inspection results.",
      count: failedInspectionItems,
      href: "/safety",
      icon: ShieldAlert,
      tone: failedInspectionItems ? "danger" : "success",
      status: failedInspectionItems ? "Rejected" : "Verified"
    },
    {
      key: "pending-sync",
      title: "Pending sync",
      description: "Offline drafts queued, failed, or flagged for conflict review.",
      count: pendingSync,
      href: "/offline",
      icon: BellRing,
      tone: pendingSync ? "warning" : "success",
      status: pendingSync ? "Unsynced" : "Synced"
    }
  ];
}
