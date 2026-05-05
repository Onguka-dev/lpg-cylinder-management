import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function WarehousePage() {
  return (
    <DashboardPlaceholder
      eyebrow="Role Workspace"
      title="Warehouse Dashboard"
      description="Placeholder for stock visibility, receiving, dispatch preparation, and cylinder handling."
      stats={[
        { label: "Warehouse views", value: "1" },
        { label: "SKU types", value: "3" },
        { label: "Movement workflows", value: "Active" }
      ]}
    />
  );
}
