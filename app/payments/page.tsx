import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function PaymentsPage() {
  return (
    <DashboardPlaceholder
      eyebrow="Core Module"
      title="Payments"
      description="Placeholder for payment capture, receipts, outstanding balances, and reconciliation."
      stats={[
        { label: "Receipts", value: "Soon" },
        { label: "Balances", value: "Soon" },
        { label: "Reconciliation", value: "Soon" }
      ]}
    />
  );
}
