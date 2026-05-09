import { brand as brandConfig } from "@/src/config/brand";

export const brand = {
  ...brandConfig,
  name: brandConfig.appName,
  groupName: brandConfig.companyName
};
