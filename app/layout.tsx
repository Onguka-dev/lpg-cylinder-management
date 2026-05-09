import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getCurrentSession } from "@/lib/auth";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${brand.appName} | LPG Cylinder Management`,
  description: `${brand.companyName} ${brand.appName} LPG cylinder management, sales, delivery, inventory, audit, and reporting platform`,
  icons: {
    icon: brand.logo.favicon,
    shortcut: brand.logo.favicon,
    apple: brand.logo.icon
  }
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();

  return (
    <html lang="en">
      <body>
        <AppShell session={session}>{children}</AppShell>
      </body>
    </html>
  );
}
