import Link from "next/link";
import { getFieldAssignment } from "@/lib/field-sales-access";
import { prisma } from "@/lib/prisma";

export default async function MsoPage() {
  const assignment = await getFieldAssignment();
  const vehicleStock = assignment.vehicle
    ? await prisma.cylinder.count({ where: { currentLocationId: assignment.vehicle.id, status: "FILLED" } })
    : 0;
  const assignedDeliveries = await prisma.delivery.count({
    where: { assignedUser: { email: "mso@example.com" }, status: { in: ["ASSIGNED", "LOADING_CONFIRMED", "CUSTOMER_ARRIVAL"] } }
  });

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Role Workspace</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">MSO Dashboard</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Field sales, assigned route visibility, vehicle stock, mobile quick actions, and offline queue support are active.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <Summary label="Assigned Vehicle" value={assignment.vehicle?.code ?? "None"} />
        <Summary label="Route" value={assignment.route?.code ?? "Placeholder"} />
        <Summary label="Filled Stock" value={String(vehicleStock)} />
        <Summary label="Active Deliveries" value={String(assignedDeliveries)} />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Link className="rounded-lg bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white" href="/field-sales">
          Open field sales workspace
        </Link>
        <Link className="rounded-lg border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700" href="/field-sales/sales/new">
          New instant sale
        </Link>
        <Link className="rounded-lg border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700" href="/deliveries">
          Delivery assignments
        </Link>
        <Link className="rounded-lg border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700" href="/offline">
          Offline mode
        </Link>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
