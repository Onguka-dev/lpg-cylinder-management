"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Boxes,
  CalendarDays,
  ChevronDown,
  Circle,
  ClipboardCheck,
  CreditCard,
  FileClock,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MapPin,
  MapPinned,
  PackageCheck,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  Warehouse,
  Wifi,
  WifiOff,
  Wrench
} from "lucide-react";
import { BrandFooter } from "@/components/brand-footer";
import { BrandHeader } from "@/components/brand-header";
import { BrandLogo } from "@/components/brand-logo";
import type { AppSession } from "@/lib/auth-types";
import type { AppRole } from "@/lib/auth-types";
import { brand } from "@/lib/brand";
import { moduleNavItems, roleNavItems } from "@/lib/navigation";
import { canAccessPath, roleLabel } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  session
}: {
  children: ReactNode;
  session: AppSession | null;
}) {
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);
  const [dateLabel, setDateLabel] = useState("");
  const [notificationCount, setNotificationCount] = useState(0);
  const allNavItems = [...moduleNavItems, ...roleNavItems].filter((item) =>
    session ? canAccessPath(session.user.role, item.href) : false
  );
  const visualNavSections = useMemo(
    () => (session ? buildNavigationSections(session.user.role) : []),
    [session]
  );
  const mobileNavItems = useMemo(
    () => (session ? buildMobileNavItems(session.user.role) : []),
    [session]
  );
  const activeItem = allNavItems
    .slice()
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const pageTitle = activeItem?.label ?? brand.productName;
  const breadcrumbs = buildBreadcrumbs(pathname, pageTitle);
  const assignedLocation = session ? assignedLocationByRole[session.user.role] : "";
  const notificationFallback = session ? notificationFallbackByRole[session.user.role] : 0;

  useEffect(() => {
    setIsOnline(navigator.onLine);
    setDateLabel(
      new Intl.DateTimeFormat("en-KE", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
      }).format(new Date())
    );

    function updateOnlineStatus() {
      setIsOnline(navigator.onLine);
    }

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setNotificationCount(notificationFallback);

    if (!session || !canAccessPath(session.user.role, "/notifications")) {
      return () => {
        isMounted = false;
      };
    }

    fetch("/api/notifications?status=PENDING", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { notifications?: unknown[] } | null) => {
        if (isMounted && Array.isArray(data?.notifications)) {
          setNotificationCount(data.notifications.length);
        }
      })
      .catch(() => {
        if (isMounted) setNotificationCount(notificationFallback);
      });

    return () => {
      isMounted = false;
    };
  }, [notificationFallback, session]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-surface-page text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-80 border-r border-slate-200 bg-white shadow-soft lg:block">
        <div className="flex h-24 items-center gap-3 border-b border-slate-100 px-6">
          <BrandHeader />
        </div>

        <nav className="h-[calc(100vh-6rem)] space-y-5 overflow-y-auto px-4 py-5" aria-label="Primary navigation">
          {visualNavSections.map((section) => (
            <NavSection key={section.title} section={section} pathname={pathname} />
          ))}
        </nav>
      </aside>

      <div className="lg:pl-80">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-panel backdrop-blur">
          <div className="flex min-h-20 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Link className="lg:hidden" href="/" aria-label={`${brand.name} home`}>
                <BrandLogo variant="icon" compact />
              </Link>
              <div className="min-w-0">
                <nav className="hidden items-center gap-1 text-xs font-medium text-slate-500 sm:flex" aria-label="Breadcrumb">
                  {breadcrumbs.map((crumb, index) => (
                    <span className="flex items-center gap-1" key={`${crumb}-${index}`}>
                      {index > 0 ? <span aria-hidden="true">/</span> : null}
                      <span className={index === breadcrumbs.length - 1 ? "text-brand-700" : undefined}>
                        {crumb}
                      </span>
                    </span>
                  ))}
                </nav>
                <p className="truncate text-lg font-bold text-slate-950">{pageTitle}</p>
              </div>
            </div>

            <div className="hidden min-w-0 flex-1 justify-center px-4 xl:flex">
              <label className="flex w-full max-w-lg items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 shadow-panel focus-within:border-brand-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100">
                <Search size={16} aria-hidden="true" />
                <span className="sr-only">Search</span>
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  placeholder="Search customers, cylinders, orders"
                  type="search"
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-panel md:flex">
                <CalendarDays size={15} className="text-brand-700" aria-hidden="true" />
                <span>{dateLabel || "Today"}</span>
              </div>
              <div
                className={cn(
                  "hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-panel md:flex",
                  isOnline
                    ? "border-success-100 bg-success-50 text-success-700"
                    : "border-warning-100 bg-warning-50 text-warning-700"
                )}
                aria-live="polite"
              >
                {isOnline ? <Wifi size={15} aria-hidden="true" /> : <WifiOff size={15} aria-hidden="true" />}
                <span>{isOnline ? "Online" : "Offline"}</span>
              </div>
              <Link
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-panel hover:border-brand-100 hover:bg-brand-50 hover:text-brand-700"
                href={session && canAccessPath(session.user.role, "/notifications") ? "/notifications" : "#"}
                aria-label={`${notificationCount} notifications`}
              >
                <Bell size={18} aria-hidden="true" />
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-danger-600 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
                  {notificationCount}
                </span>
              </Link>
              {session ? (
                <>
                  <details className="group relative hidden sm:block">
                    <summary className="flex cursor-pointer list-none items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm shadow-panel outline-none hover:border-brand-100 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-200">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                        {roleLabel(session.user.role).slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 text-left">
                        <span className="block truncate font-semibold text-slate-900">
                          {roleLabel(session.user.role)}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          Active workspace
                        </span>
                      </span>
                      <ChevronDown size={14} className="text-slate-400 transition group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <div className="absolute right-0 mt-2 w-72 rounded-brand border border-slate-200 bg-white p-3 shadow-soft">
                      <p className="text-sm font-semibold text-slate-950">{roleLabel(session.user.role)} account</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{session.user.email}</p>
                      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                        <p className="font-semibold text-slate-900">{roleLabel(session.user.role)}</p>
                        <p className="mt-1 flex items-center gap-1">
                          <MapPin size={13} aria-hidden="true" />
                          {assignedLocation}
                        </p>
                      </div>
                      <Link
                        className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                        href="/profile"
                      >
                        Profile and settings
                        <UserCog size={15} aria-hidden="true" />
                      </Link>
                    </div>
                  </details>
                  <form action="/api/auth/logout" method="post">
                    <button
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-brand-100 hover:bg-brand-50 hover:text-brand-700"
                      type="submit"
                      aria-label="Logout"
                    >
                      <LogOut size={18} aria-hidden="true" />
                    </button>
                  </form>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <main className="px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-6">{children}</main>
        <BrandFooter />

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-soft backdrop-blur lg:hidden" aria-label="Mobile navigation">
          <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = isNavActive(pathname, item.href);

              return (
                <Link
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center rounded-lg px-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200",
                    isActive ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                  href={item.href}
                  key={item.key}
                >
                  <Icon size={19} aria-hidden="true" />
                  <span className="mt-1 truncate">{item.mobileLabel ?? item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

type ShellNavItem = {
  key: string;
  href: string;
  label: string;
  mobileLabel?: string;
  icon: LucideIcon;
  children?: ShellNavItem[];
};

type ShellNavSection = {
  title: string;
  items: ShellNavItem[];
};

function NavSection({
  section,
  pathname
}: {
  section: ShellNavSection;
  pathname: string;
}) {
  if (section.items.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {section.title}
      </p>
      <div className="mt-2 space-y-1">
        {section.items.map((item) => (
          <NavItemLink item={item} pathname={pathname} key={item.key} />
        ))}
      </div>
    </div>
  );
}

function NavItemLink({ item, pathname }: { item: ShellNavItem; pathname: string }) {
  const Icon = item.icon;
  const isActive = isNavActive(pathname, item.href);
  const hasChildren = Boolean(item.children?.length);

  return (
    <div>
      <Link
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200",
          isActive
            ? "bg-brand-50 text-brand-700 shadow-panel"
            : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
        )}
        href={item.href}
      >
        <Icon size={18} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {hasChildren ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            {item.children?.length}
          </span>
        ) : null}
      </Link>
      {hasChildren ? (
        <div className="ml-6 mt-1 space-y-1 border-l border-slate-100 pl-3">
          {item.children?.map((child) => {
            const ChildIcon = child.icon;
            const childActive = isNavActive(pathname, child.href);

            return (
              <Link
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200",
                  childActive ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
                href={child.href}
                key={child.key}
              >
                <ChildIcon size={14} aria-hidden="true" />
                <span className="truncate">{child.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function buildNavigationSections(role: AppRole) {
  const sections: ShellNavSection[] = [
    {
      title: "Dashboard",
      items: [
        { key: "dashboard", href: "/", label: "Dashboard", icon: LayoutDashboard }
      ]
    },
    {
      title: "Warehouse Management",
      items: [
        {
          key: "warehouse-management",
          href: "/warehouse",
          label: "Warehouse Management",
          icon: Warehouse,
          children: [
            { key: "warehouse-overview", href: "/warehouse", label: "Warehouse Overview", icon: LayoutDashboard },
            { key: "warehouse-mobile", href: "/warehouse/mobile", label: "Mobile Workspace", icon: Warehouse },
            { key: "zone-a-incoming", href: "/warehouse/incoming", label: "Zone A Incoming", icon: Circle },
            { key: "zone-b-storage", href: "/warehouse", label: "Zone B Storage", icon: Boxes },
            { key: "zone-c-dispatch", href: "/warehouse", label: "Zone C Dispatch / Loading Bay", icon: Truck },
            { key: "zone-d-maintenance", href: "/safety", label: "Zone D Maintenance", icon: Wrench },
            { key: "asset-tracking", href: "/inventory/cylinders", label: "Asset Tracking", icon: PackageCheck },
            { key: "stock-movements", href: "/inventory/movements", label: "Stock Movements", icon: PackageCheck },
            { key: "transfer-requests", href: "/transfers", label: "Transfer Requests", icon: Truck },
            { key: "warehouse-reports", href: "/reports", label: "Warehouse Reports", icon: BarChart3 }
          ]
        },
        { key: "inventory", href: "/inventory", label: "Inventory", icon: Boxes }
      ]
    },
    {
      title: "Retail Points",
      items: [
        { key: "retail-sales", href: "/retail-sales", label: "Retail Sales", icon: ShoppingCart },
        { key: "retail-inventory", href: "/retail-inventory", label: "Retail Inventory", icon: Boxes },
        { key: "retail-complaints", href: "/retail-sales/complaints", label: "Complaints", icon: Bell },
        { key: "rso", href: "/rso", label: "RSO Workspace", icon: MapPinned }
      ]
    },
    {
      title: "MSO / Field Sales",
      items: [
        { key: "field-sales", href: "/field-sales", label: "Field Sales", icon: MapPinned },
        { key: "mso", href: "/mso", label: "MSO Workspace", icon: UserCog },
        { key: "offline", href: "/offline", label: "Offline Mode", icon: Wifi }
      ]
    },
    {
      title: "Customer Management",
      items: [
        { key: "customers", href: "/customers", label: "Customers", icon: Users },
        { key: "customer", href: "/customer", label: "Customer Portal", icon: Users }
      ]
    },
    {
      title: "Orders and Deliveries",
      items: [
        { key: "orders", href: "/orders", label: "Orders", icon: ShoppingCart },
        { key: "deliveries", href: "/deliveries", label: "Deliveries", icon: Truck }
      ]
    },
    {
      title: "Payments and Reconciliation",
      items: [
        { key: "payments", href: "/payments", label: "Payments", icon: CreditCard },
        { key: "reconciliations", href: "/reconciliations", label: "Reconciliation", icon: ClipboardCheck }
      ]
    },
    {
      title: "Safety and Compliance",
      items: [
        { key: "safety", href: "/safety", label: "Safety", icon: ShieldAlert },
        { key: "audit-logs", href: "/audit-logs", label: "Audit Logs", icon: FileClock },
        { key: "auditor", href: "/auditor", label: "Auditor Workspace", icon: ClipboardCheck }
      ]
    },
    {
      title: "Reports",
      items: [
        { key: "reports", href: "/reports", label: "Reports", icon: BarChart3 },
        { key: "notifications", href: "/notifications", label: "Notifications", icon: Bell },
        { key: "integrations", href: "/integrations", label: "Integrations", icon: PackageCheck }
      ]
    },
    {
      title: "User Management",
      items: [
        { key: "admin", href: "/admin", label: "Admin", icon: ShieldCheck },
        { key: "master-data", href: "/admin/master-data", label: "Master Data", icon: ListChecks }
      ]
    },
    {
      title: "Settings",
      items: [
        { key: "settings", href: "/settings", label: "Settings", icon: Settings }
      ]
    }
  ];

  return sections
    .map((section) => ({
      ...section,
      items: filterPermittedItems(section.items, role)
    }))
    .filter((section) => section.items.length > 0);
}

function filterPermittedItems(items: ShellNavItem[], role: AppRole): ShellNavItem[] {
  return items
    .map((item) => ({
      ...item,
      children: item.children ? filterPermittedItems(item.children, role) : undefined
    }))
    .filter((item) => canAccessPath(role, item.href) || Boolean(item.children?.length));
}

function buildMobileNavItems(role: AppRole) {
  const preferred: ShellNavItem[] = [
    { key: "mobile-dashboard", href: "/", label: "Dashboard", mobileLabel: "Home", icon: LayoutDashboard },
    { key: "mobile-warehouse", href: "/warehouse", label: "Warehouse", icon: Warehouse },
    { key: "mobile-retail", href: "/retail-sales", label: "Retail", icon: ShoppingCart },
    { key: "mobile-field", href: "/field-sales", label: "Field Sales", mobileLabel: "Field", icon: MapPinned },
    { key: "mobile-orders", href: "/orders", label: "Orders", icon: ShoppingCart },
    { key: "mobile-deliveries", href: "/deliveries", label: "Deliveries", icon: Truck },
    { key: "mobile-customers", href: "/customers", label: "Customers", icon: Users },
    { key: "mobile-payments", href: "/payments", label: "Payments", icon: CreditCard },
    { key: "mobile-reports", href: "/reports", label: "Reports", icon: BarChart3 }
  ];

  return preferred.filter((item) => canAccessPath(role, item.href)).slice(0, 5);
}

function isNavActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

function buildBreadcrumbs(pathname: string, pageTitle: string) {
  if (pathname === "/") {
    return ["Dashboard"];
  }

  const parts = pathname
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()));

  return ["Dashboard", ...parts.slice(0, -1), pageTitle];
}

const assignedLocationByRole: Record<AppRole, string> = {
  ADMIN: "Head Office Command Centre",
  WAREHOUSE_MANAGER: "Central Warehouse",
  RSO: "Retail Outlet Network",
  MSO: "Assigned Route / Vehicle",
  AUDITOR: "Audit and Compliance Desk",
  CUSTOMER: "Customer Self-Service"
};

const notificationFallbackByRole: Record<AppRole, number> = {
  ADMIN: 5,
  WAREHOUSE_MANAGER: 4,
  RSO: 3,
  MSO: 3,
  AUDITOR: 2,
  CUSTOMER: 1
};
