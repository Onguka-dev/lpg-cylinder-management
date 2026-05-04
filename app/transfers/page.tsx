import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function TransfersPage() {
  return (
    <DashboardPlaceholder
      eyebrow="Warehouse Module"
      title="Transfers"
      description="Placeholder for warehouse transfer requests, approvals, and movement tracking. No transfer workflow is implemented in Stage 1."
      stats={[
        { label: "Transfer queue", value: "Soon" },
        { label: "Approvals", value: "Soon" },
        { label: "Movement logs", value: "Soon" }
      ]}
    />
  );
}
