import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getCurrentSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "LPG Cylinder Management",
  description: "Stage 0 skeleton for an LPG cylinder management app"
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
