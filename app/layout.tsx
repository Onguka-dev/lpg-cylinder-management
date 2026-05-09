import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getCurrentSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "LPG Cylinder Management",
  description: "Stage 17 LPG cylinder management app with security, audit, and system controls"
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
