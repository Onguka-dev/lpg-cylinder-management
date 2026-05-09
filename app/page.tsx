import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function HomePage() {
  return (
    <DashboardPlaceholder
      title="Operations Dashboard"
      eyebrow="Stage 18"
      description="Testing, deployment, training, UAT readiness, reset scripts, role guides, production checklists, and end-to-end demo data are prepared."
      stats={[
        { label: "Role workspaces", value: "6" },
        { label: "Readiness docs", value: "6" },
        { label: "Test files", value: "18" }
      ]}
    />
  );
}
