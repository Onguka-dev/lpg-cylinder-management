import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function HomePage() {
  return (
    <DashboardPlaceholder
      title="Operations Dashboard"
      eyebrow="Stage 6"
      description="Authentication, master data, customer management, cylinder inventory, movement workflows, and RSO walk-in refill sales are active. Delivery and advanced credit remain placeholders."
      stats={[
        { label: "Role workspaces", value: "6" },
        { label: "Payment methods", value: "3" },
        { label: "Refill workflow", value: "Active" }
      ]}
    />
  );
}
