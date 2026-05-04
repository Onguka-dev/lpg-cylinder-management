import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export default function InventoryPage() {
  return (
    <DashboardPlaceholder
      eyebrow="Core Module"
      title="Inventory"
      description="Placeholder for LPG cylinder stock, SKU balances, empty/full status, and location-level movement."
      stats={[
        { label: "SKU types", value: "3" },
        { label: "Locations", value: "4" },
        { label: "Stock logic", value: "Soon" }
      ]}
    />
  );
}
