import { DEFAULT_CURRENCY } from "@/lib/currency";

export const brand = {
  appName: "Wells Gas",
  companyName: "Green Wells Energies",
  productName: "Wells Gas LPG Operations",
  shortName: "Wells",
  tagline: "Your Energy of Choice",
  stageLabel: "Client-ready LPG management",
  supportLine: "Operations command centre",
  defaultCurrency: DEFAULT_CURRENCY,
  logo: {
    light: "/brand/wells-gas-logo-light.svg",
    dark: "/brand/wells-gas-logo-dark.svg",
    icon: "/brand/wells-gas-icon.svg",
    favicon: "/brand/favicon.svg"
  },
  assetsArePlaceholders: true
} as const;
