import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerForm } from "@/components/customer-form";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { getCurrentSession } from "@/lib/auth";
import { canManageCustomers } from "@/lib/customers";

export default async function NewCustomerPage() {
  const session = await getCurrentSession();

  if (!session || !canManageCustomers(session.user.role)) {
    redirect("/unauthorized");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-24 sm:pb-0">
      <PageHeader
        eyebrow="Retail Point Sales"
        title="Register Customer"
        description="Mobile-friendly customer onboarding with duplicate checks by phone and ID/passport/proof reference."
        actions={<Link className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700" href="/customers">Back</Link>}
      />
      <SectionCard title="Customer details" description="Use the existing customer API and validation rules.">
        <CustomerForm />
      </SectionCard>
    </div>
  );
}
