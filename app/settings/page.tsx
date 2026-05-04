import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function SettingsPage() {
  return (
    <DashboardPlaceholder
      eyebrow="Core Module"
      title="Settings"
      description="Placeholder for application configuration, account preferences, and future system controls."
      stats={[
        { label: "App config", value: "Soon" },
        { label: "Access", value: "Soon" },
        { label: "Notifications", value: "Soon" }
      ]}
    />
  );
}
