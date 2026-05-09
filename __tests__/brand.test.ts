import { describe, expect, it } from "vitest";
import { brand } from "@/src/config/brand";
import { DEFAULT_CURRENCY } from "@/lib/currency";

describe("Wells Gas brand configuration", () => {
  it("centralizes client branding and currency", () => {
    expect(brand.appName).toBe("Wells Gas");
    expect(brand.companyName).toBe("Green Wells Energies");
    expect(brand.tagline).toBe("Your Energy of Choice");
    expect(brand.defaultCurrency).toBe(DEFAULT_CURRENCY);
  });

  it("points at replaceable brand assets", () => {
    expect(brand.logo.light).toBe("/brand/wells-gas-logo-light.svg");
    expect(brand.logo.dark).toBe("/brand/wells-gas-logo-dark.svg");
    expect(brand.logo.favicon).toBe("/brand/favicon.svg");
    expect(brand.assetsArePlaceholders).toBe(true);
  });
});
