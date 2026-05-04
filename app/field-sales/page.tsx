import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function FieldSalesPage() {
  return (
    <DashboardPlaceholder
      eyebrow="MSO Module"
      title="Field Sales"
      description="Placeholder for field sales activity, territory visits, and customer follow-up. No sales workflow is implemented in Stage 1."
      stats={[
        { label: "Field visits", value: "Soon" },
        { label: "Leads", value: "Soon" },
        { label: "Territories", value: "Soon" }
      ]}
    />
  );
}
