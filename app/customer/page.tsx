import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function CustomerPage() {
  return (
    <DashboardPlaceholder
      eyebrow="Role Workspace"
      title="Customer Portal Placeholder"
      description="Placeholder for a future customer self-service view. No customer workflow is implemented in Stage 1."
      stats={[
        { label: "Orders", value: "Soon" },
        { label: "Deliveries", value: "Soon" },
        { label: "Payments", value: "Soon" }
      ]}
    />
  );
}
