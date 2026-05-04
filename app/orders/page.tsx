import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function OrdersPage() {
  return (
    <DashboardPlaceholder
      eyebrow="Core Module"
      title="Orders"
      description="Placeholder for customer orders, order approvals, fulfillment status, and sales coordination."
      stats={[
        { label: "Draft orders", value: "Soon" },
        { label: "Approvals", value: "Soon" },
        { label: "Fulfillment", value: "Soon" }
      ]}
    />
  );
}
