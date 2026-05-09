import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CustomerComplaintForm } from "@/components/customer-complaint-form";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { getCurrentSession } from "@/lib/auth";
import { canManageCustomerComplaints } from "@/lib/customer-complaints";
import { getAssignedMasterLocationId } from "@/lib/inventory-movement-access";
import { locationMasterTypes } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export default async function NewRetailComplaintPage() {
  const session = await getCurrentSession();

  if (!session || !canManageCustomerComplaints(session.user.role)) {
    redirect("/unauthorized");
  }

  const assignedLocationId =
    session.user.role === "RSO" || session.user.role === "MSO"
      ? await getAssignedMasterLocationId(session.user.id)
      : null;
  const [customers, locations] = await Promise.all([
    prisma.customer.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, take: 100 }),
    prisma.masterDataRecord.findMany({
      where: { type: { in: [...locationMasterTypes] }, isActive: true },
      orderBy: [{ type: "asc" }, { name: "asc" }]
    })
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-24 sm:pb-0">
      <PageHeader
        eyebrow="Retail Point Sales"
        title="Submit Complaint / Escalation"
        description="Capture customer service issues, safety concerns and urgent escalations from the retail POS."
        actions={
          <Link className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700" href="/retail-sales/complaints">
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </Link>
        }
      />

      <SectionCard title="Issue details" description="Critical issues are automatically marked as escalated for supervisor review.">
        <CustomerComplaintForm customers={customers} locations={locations} assignedLocationId={assignedLocationId} />
      </SectionCard>
    </div>
  );
}
