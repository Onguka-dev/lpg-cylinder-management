import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function RetailInventoryPage() {
  return (
    <DashboardPlaceholder
      eyebrow="RSO Module"
      title="Retail Inventory"
      description="Placeholder for outlet-level cylinder availability and restock visibility. No inventory workflow is implemented in Stage 1."
      stats={[
        { label: "Outlet stock", value: "Soon" },
        { label: "Restock needs", value: "Soon" },
        { label: "SKU coverage", value: "Soon" }
      ]}
    />
  );
}
