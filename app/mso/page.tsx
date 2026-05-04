import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function MsoPage() {
  return (
    <DashboardPlaceholder
      eyebrow="Role Workspace"
      title="MSO Dashboard"
      description="Placeholder for market sales operations, customer follow-up, and outlet-level order tracking."
      stats={[
        { label: "Market view", value: "TBD" },
        { label: "Orders", value: "Soon" },
        { label: "Customers", value: "Soon" }
      ]}
    />
  );
}
