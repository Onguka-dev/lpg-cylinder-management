import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function RetailSalesPage() {
  return (
    <DashboardPlaceholder
      eyebrow="RSO Module"
      title="Retail Sales"
      description="Placeholder for regional retail sales summaries and follow-up. No sales workflow is implemented in Stage 1."
      stats={[
        { label: "Retail orders", value: "Soon" },
        { label: "Outlet sales", value: "Soon" },
        { label: "Regional view", value: "Soon" }
      ]}
    />
  );
}
