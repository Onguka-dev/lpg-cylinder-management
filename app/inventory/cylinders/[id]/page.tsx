import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { canManageInventory, formatCylinderStatus } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export default async function CylinderDetailPage({
  params
}: {
  params: { id: string };
}) {
  const [session, cylinder] = await Promise.all([
    getCurrentSession(),
    prisma.cylinder.findUnique({
      where: { id: params.id },
      include: {
        sku: true,
        currentLocation: true,
        customerCustodies: {
          orderBy: { issueDate: "desc" },
          include: { customer: true, issueLocation: true, returnLocation: true },
          take: 10
        },
        historyEntries: {
          orderBy: { createdAt: "desc" },
          include: { changedBy: true },
          take: 30
        }
      }
    })
  ]);

  if (!cylinder) {
    notFound();
  }

  const canManage = session ? canManageInventory(session.user.role) : false;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link className="text-sm font-medium text-brand-700" href="/inventory/cylinders">Back to cylinders</Link>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-700">Cylinder Profile</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">{cylinder.serialNumber}</h1>
            <p className="mt-2 text-sm text-slate-500">{cylinder.sku.name}</p>
          </div>
          {canManage ? (
            <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" href={`/inventory/cylinders/${cylinder.id}/edit`}>
              Edit Cylinder
            </Link>
          ) : null}
        </div>
        <dl className="mt-8 grid gap-4 md:grid-cols-3">
          <Detail label="Barcode/RFID" value={cylinder.barcode ?? "None"} />
          <Detail label="Factory Serial No." value={cylinder.factorySerialNo ?? cylinder.serialNumber} />
          <Detail label="QR Code" value={cylinder.qrCode ?? "None"} />
          <Detail label="Cylinder Size" value={cylinder.cylinderSizeKg ? `${cylinder.cylinderSizeKg}kg` : `${cylinder.sku.capacityKg ?? "Not set"}kg`} />
          <Detail label="Manufacturer" value={cylinder.manufacturer ?? "Not set"} />
          <Detail label="Status" value={formatCylinderStatus(cylinder.status)} />
          <Detail label="Current Location" value={cylinder.currentLocation.name} />
          <Detail label="Active Asset" value={cylinder.activeStatus ? "Yes" : "No"} />
          <Detail label="Company Property" value={cylinder.companyOwned ? "Yes" : "No"} />
          <Detail label="Blocked Reason" value={cylinder.blockedReason ?? "None"} />
          <Detail label="Manufacture Date" value={formatDate(cylinder.manufactureDate)} />
          <Detail label="Inspection Due" value={formatDate(cylinder.inspectionDueDate)} />
          <Detail label="Expiry Date" value={formatDate(cylinder.expiryDate)} />
          <Detail label="Hydro-Test Due" value={formatDate(cylinder.hydroTestDueDate)} />
          <Detail label="Unsafe" value={cylinder.unsafeStatus ? "Yes" : "No"} />
          <Detail label="Quarantined" value={cylinder.quarantinedStatus ? "Yes" : "No"} />
          <Detail label="Maintenance" value={cylinder.maintenanceStatus.replaceAll("_", " ").toLowerCase()} />
          <Detail label="Notes" value={cylinder.notes ?? "None"} />
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Customer Custody</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Issue Date</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Follow-up</th>
                <th className="px-4 py-3">Return</th>
                <th className="px-4 py-3">Return Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cylinder.customerCustodies.length ? cylinder.customerCustodies.map((custody) => (
                <tr key={custody.id}>
                  <td className="px-4 py-3 text-slate-700">{custody.customer.name}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(custody.issueDate)}</td>
                  <td className="px-4 py-3 text-slate-500">{custody.saleReference ?? custody.refillReference ?? "None"}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(custody.expectedReturnFollowUpDate)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(custody.returnDate)}</td>
                  <td className="px-4 py-3 text-slate-500">{custody.returnLocation?.name ?? "Not returned"}</td>
                </tr>
              )) : (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>No customer custody records yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Status & Location History</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">From Status</th>
                <th className="px-4 py-3">To Status</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Changed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cylinder.historyEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 text-slate-500">{entry.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                  <td className="px-4 py-3 text-slate-500">{entry.previousStatus ? formatCylinderStatus(entry.previousStatus) : "None"}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCylinderStatus(entry.newStatus)}</td>
                  <td className="px-4 py-3 text-slate-500">{entry.reason}</td>
                  <td className="px-4 py-3 text-slate-500">{entry.changedBy?.name ?? "System"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function formatDate(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "Not set";
}
