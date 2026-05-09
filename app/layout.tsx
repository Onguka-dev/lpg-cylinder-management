import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getCurrentSession } from "@/lib/auth";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${brand.name} | LPG Cylinder Management`,
  description: "Professional Wells Gas LPG cylinder management, sales, delivery, inventory, audit, and reporting platform"
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
