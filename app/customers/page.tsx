import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function CustomersPage() {
  return (
    <DashboardPlaceholder
      eyebrow="Core Module"
      title="Customer Management"
      description="Placeholder for customer profiles, contacts, addresses, and customer-specific cylinder history."
      stats={[
        { label: "Profiles", value: "Soon" },
        { label: "Contacts", value: "Soon" },
        { label: "Segments", value: "Soon" }
      ]}
    />
  );
}
