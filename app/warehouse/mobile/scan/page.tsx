import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BatchScanPanel } from "@/components/scanner-input";
import { getCurrentSession } from "@/lib/auth";

export default async function WarehouseMobileScanPage() {
  const session = await getCurrentSession();
  if (!session || !["ADMIN", "WAREHOUSE_MANAGER"].includes(session.user.role)) redirect("/unauthorized");

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-24">
      <div className="flex items-center gap-3">
        <Link className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white" href="/warehouse/mobile">
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-950">Scan & Verify</h1>
      </div>
      <BatchScanPanel action="MOBILE_VERIFY" title="Scan & verify cylinders" />
    </div>
  );
}
