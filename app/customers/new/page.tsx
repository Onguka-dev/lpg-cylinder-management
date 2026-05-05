import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerForm } from "@/components/customer-form";
import { getCurrentSession } from "@/lib/auth";
import { canManageCustomers } from "@/lib/customers";

export default async function NewCustomerPage() {
  const session = await getCurrentSession();

  if (!session || !canManageCustomers(session.user.role)) {
    redirect("/unauthorized");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link className="text-sm font-medium text-brand-700" href="/customers">
        Back to customers
      </Link>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Customer Registration</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Register Customer</h1>
        <div className="mt-6">
          <CustomerForm />
        </div>
      </section>
    </div>
  );
}
