import {
  BarChart3,
  BellRing,
  Boxes,
  ClipboardCheck,
  CreditCard,
  FileClock,
  LayoutDashboard,
  ListChecks,
  MapPinned,
  PackageCheck,
  PlugZap,
  Settings,
  ShieldCheck,
  ShieldAlert,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  Warehouse,
  Wifi
} from "lucide-react";

export const roleNavItems = [
  { href: "/admin", label: "Admin", icon: ShieldCheck },
  { href: "/warehouse", label: "Warehouse", icon: Warehouse },
  { href: "/rso", label: "RSO", icon: MapPinned },
  { href: "/mso", label: "MSO", icon: UserCog },
  { href: "/auditor", label: "Auditor", icon: ClipboardCheck },
  { href: "/customer", label: "Customer", icon: Users }
];

export const moduleNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/master-data", label: "Master Data", icon: ListChecks },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/inventory/supplier-receipts", label: "Supplier Receipts", icon: PackageCheck },
  { href: "/inventory/plant-transfers", label: "Plant Transfers", icon: Truck },
  { href: "/inventory/selling-point-dispatches", label: "Selling Point Dispatches", icon: Truck },
  { href: "/inventory/empty-return-transfers", label: "Empty Return Transfers", icon: Truck },
  { href: "/inventory/movements", label: "Movements", icon: PackageCheck },
  { href: "/transfers", label: "Transfers", icon: PackageCheck },
  { href: "/retail-sales", label: "Retail Sales", icon: ShoppingCart },
  { href: "/retail-sales/pos", label: "POS", icon: ShoppingCart },
  { href: "/retail-sales/empty-returns/new", label: "Empty Returns", icon: PackageCheck },
  { href: "/retail-inventory", label: "Retail Inventory", icon: Boxes },
  { href: "/field-sales", label: "Field Sales", icon: MapPinned },
  { href: "/offline", label: "Offline Mode", icon: Wifi },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/deliveries", label: "Deliveries", icon: Truck },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/reconciliations", label: "Reconciliation", icon: ClipboardCheck },
  { href: "/safety", label: "Safety", icon: ShieldAlert },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/integrations", label: "Integrations", icon: PlugZap },
  { href: "/notifications", label: "Notifications", icon: BellRing },
  { href: "/audit-logs", label: "Audit Logs", icon: FileClock },
  { href: "/settings", label: "Settings", icon: Settings }
];

export const skuPreviewItems = [
  { name: "6kg", detail: "Small household cylinder" },
  { name: "13kg", detail: "Standard household cylinder" },
  { name: "50kg", detail: "Commercial cylinder" }
];
