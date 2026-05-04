import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function ReportsPage() {
  return (
    <DashboardPlaceholder
      eyebrow="Core Module"
      title="Reports"
      description="Placeholder for operational dashboards, audit exports, inventory reports, and sales summaries."
      stats={[
        { label: "Inventory reports", value: "Soon" },
        { label: "Sales reports", value: "Soon" },
        { label: "Audit reports", value: "Soon" }
      ]}
    />
  );
}
