import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerForm } from "@/components/customer-form";
import { getCurrentSession } from "@/lib/auth";
import { canManageCustomers } from "@/lib/customers";
import { prisma } from "@/lib/prisma";

export default async function EditCustomerPage({
  params
}: {
  params: { id: string };
}) {
  const [session, customer] = await Promise.all([
    getCurrentSession(),
    prisma.customer.findUnique({
      where: { id: params.id }
    })
  ]);

  if (!session || !canManageCustomers(session.user.role)) {
    redirect("/unauthorized");
  }

  if (!customer) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link className="text-sm font-medium text-brand-700" href={`/customers/${customer.id}`}>
        Back to profile
      </Link>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Edit Customer</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">{customer.name}</h1>
        <div className="mt-6">
          <CustomerForm
            customer={{
              id: customer.id,
              name: customer.name,
              phone: customer.phone,
              proofReference: customer.proofReference,
              category: customer.category,
              address: customer.address,
              latitude: customer.latitude?.toString(),
              longitude: customer.longitude?.toString(),
              status: customer.status,
              creditLimit: customer.creditLimit?.toString(),
              notes: customer.notes
            }}
          />
        </div>
      </section>
    </div>
  );
}
