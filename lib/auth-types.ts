export type AppRole =
  | "ADMIN"
  | "WAREHOUSE_MANAGER"
  | "PLANT_MANAGER"
  | "RSO"
  | "MSO"
  | "SERVICE_CENTRE_STAFF"
  | "FINANCE_SAP_REVIEWER"
  | "AUDITOR"
  | "CUSTOMER";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
};

export type AppSession = {
  sessionId: string;
  user: SessionUser;
  issuedAt: number;
  expiresAt: number;
};
