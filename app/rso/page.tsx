import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function RsoPage() {
  return (
    <DashboardPlaceholder
      eyebrow="Role Workspace"
      title="RSO Dashboard"
      description="Placeholder for regional sales operations, field coordination, and regional performance summaries."
      stats={[
        { label: "Assigned region", value: "TBD" },
        { label: "Sales queues", value: "Soon" },
        { label: "Reports", value: "Soon" }
      ]}
    />
  );
}
