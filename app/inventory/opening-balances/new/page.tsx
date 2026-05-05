import Link from "next/link";
import { redirect } from "next/navigation";
import { OpeningBalanceForm } from "@/components/opening-balance-form";
import { getCurrentSession } from "@/lib/auth";
import { canManageInventory, locationMasterTypes } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export default async function NewOpeningBalancePage() {
  const session = await getCurrentSession();

  if (!session || !canManageInventory(session.user.role)) {
    redirect("/unauthorized");
  }

  const [skus, locations] = await Promise.all([
    prisma.masterDataRecord.findMany({
      where: { type: "SKU_MASTER", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true }
    }),
    prisma.masterDataRecord.findMany({
      where: { type: { in: [...locationMasterTypes] }, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true }
    })
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link className="text-sm font-medium text-brand-700" href="/inventory/cylinders">Back to cylinders</Link>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Opening Balance</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Manual Opening Balance Entry</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Import-style entry that creates initial cylinder records and history entries.
        </p>
        <div className="mt-6">
          <OpeningBalanceForm skus={skus} locations={locations} />
        </div>
      </section>
    </div>
  );
}
