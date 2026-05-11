import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentSession } from "@/lib/auth";
import { canManageCustomerComplaints, canViewCustomerComplaints, formatComplaintValue } from "@/lib/customer-complaints";
import { getAssignedMasterLocationId } from "@/lib/inventory-movement-access";
import { prisma } from "@/lib/prisma";

export default async function RetailComplaintsPage() {
  const session = await getCurrentSession();

  if (!session || !canViewCustomerComplaints(session.user.role)) {
    redirect("/unauthorized");
  }

  const assignedLocationId =
    session.user.role === "RSO" || session.user.role === "MSO" || session.user.role === "SERVICE_CENTRE_STAFF"
      ? await getAssignedMasterLocationId(session.user.id).catch(() => null)
      : null;
  const complaints = await prisma.customerComplaint.findMany({
    where: assignedLocationId ? { locationId: assignedLocationId } : undefined,
    include: { customer: true, location: true, createdBy: true },
    orderBy: { createdAt: "desc" },
    take: 100
  }).catch(() => []);
  const canCreate = canManageCustomerComplaints(session.user.role);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24 sm:pb-0">
      <PageHeader
        eyebrow="Retail Point Sales"
        title="Customer Complaints & Escalations"
        description="Track retail point complaints, safety issues and service escalations from the POS workflow."
        actions={canCreate ? (
          <Link className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white" href="/retail-sales/complaints/new">
            <Plus size={16} aria-hidden="true" />
            New issue
          </Link>
        ) : null}
      />

      <SectionCard title="Issue log" description="Submitted complaints and escalations for the current retail scope.">
        {complaints.length ? (
          <div className="space-y-3">
            {complaints.map((complaint) => (
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={complaint.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-950">{complaint.complaintNumber}</p>
                    <p className="mt-1 text-sm text-slate-600">{complaint.customer?.name ?? "Walk-in customer"} at {complaint.location?.name ?? "Retail point"}</p>
                  </div>
                  <StatusBadge tone={complaint.status === "ESCALATED" ? "warning" : "info"}>{formatComplaintValue(complaint.status)}</StatusBadge>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{complaint.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge tone={complaint.priority === "CRITICAL" || complaint.priority === "HIGH" ? "danger" : "neutral"}>{formatComplaintValue(complaint.priority)}</StatusBadge>
                  <StatusBadge tone="brand">{formatComplaintValue(complaint.type)}</StatusBadge>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={AlertTriangle} title="No complaints recorded" description="Customer complaints and escalations submitted from the retail POS will appear here." />
        )}
      </SectionCard>
    </div>
  );
}
