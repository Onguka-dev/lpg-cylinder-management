import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  CreditCard,
  FileClock,
  LayoutDashboard,
  MapPinned,
  PackageCheck,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  Warehouse
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
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/transfers", label: "Transfers", icon: PackageCheck },
  { href: "/retail-sales", label: "Retail Sales", icon: ShoppingCart },
  { href: "/retail-inventory", label: "Retail Inventory", icon: Boxes },
  { href: "/field-sales", label: "Field Sales", icon: MapPinned },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/deliveries", label: "Deliveries", icon: Truck },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/audit-logs", label: "Audit Logs", icon: FileClock },
  { href: "/settings", label: "Settings", icon: Settings }
];

export const skuPreviewItems = [
  { name: "6kg", detail: "Small household cylinder" },
  { name: "13kg", detail: "Standard household cylinder" },
  { name: "50kg", detail: "Commercial cylinder" }
];
