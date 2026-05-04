import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function AdminPage() {
  return (
    <DashboardPlaceholder
      eyebrow="Role Workspace"
      title="Admin Dashboard"
      description="Placeholder for organization setup, user access, configuration, and cross-module oversight."
      stats={[
        { label: "Seed roles", value: "5" },
        { label: "Sample users", value: "5" },
        { label: "Locations", value: "4" }
      ]}
    />
  );
}
