"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Bell, Flame, LogOut, Menu, Search } from "lucide-react";
import type { AppSession } from "@/lib/auth-types";
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
  const allNavItems = [...moduleNavItems, ...roleNavItems].filter((item) =>
    session ? canAccessPath(session.user.role, item.href) : false
  );
  const visibleModuleItems = moduleNavItems.filter((item) =>
    session ? canAccessPath(session.user.role, item.href) : false
  );
  const visibleRoleItems = roleNavItems.filter((item) =>
    session ? canAccessPath(session.user.role, item.href) : false
  );

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fuel-500 text-white">
            <Flame size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold">LPG Manager</p>
            <p className="text-xs text-slate-500">Cylinder operations</p>
          </div>
        </div>

        <nav className="space-y-6 overflow-y-auto px-3 py-5">
          <NavGroup title="Modules" items={visibleModuleItems} pathname={pathname} />
          <NavGroup title="Role Views" items={visibleRoleItems} pathname={pathname} />
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 lg:hidden"
                type="button"
                aria-label="Open navigation"
              >
                <Menu size={20} aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  LPG Cylinder Management
                </p>
                <p className="truncate text-xs text-slate-500">
                  Stage 13 reporting and analytics
                </p>
              </div>
            </div>

            <div className="hidden min-w-0 flex-1 justify-center px-6 md:flex">
              <div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                <Search size={16} aria-hidden="true" />
                <span className="truncate">Search placeholder</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
                type="button"
                aria-label="Notifications"
              >
                <Bell size={18} aria-hidden="true" />
              </button>
              {session ? (
                <>
                  <div className="hidden rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 sm:block">
                    {roleLabel(session.user.role)}
                  </div>
                  <form action="/api/auth/logout" method="post">
                    <button
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
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

          <nav className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-3 lg:hidden">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                    isActive
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <Icon size={16} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

type NavItem = (typeof moduleNavItems)[number] | (typeof roleNavItems)[number];

function NavGroup({
  title,
  items,
  pathname
}: {
  title: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div>
      <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <div className="mt-2 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              )}
              href={item.href}
              key={item.href}
            >
              <Icon size={18} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
