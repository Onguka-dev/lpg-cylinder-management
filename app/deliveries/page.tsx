import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function DeliveriesPage() {
  return (
    <DashboardPlaceholder
      eyebrow="Core Module"
      title="Deliveries"
      description="Placeholder for dispatch planning, delivery tracking, proof of delivery, and driver assignments."
      stats={[
        { label: "Dispatches", value: "Soon" },
        { label: "Vehicles", value: "Soon" },
        { label: "Proofs", value: "Soon" }
      ]}
    />
  );
}
