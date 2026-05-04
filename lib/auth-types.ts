export type AppRole =
  | "ADMIN"
  | "WAREHOUSE_MANAGER"
  | "RSO"
  | "MSO"
  | "AUDITOR"
  | "CUSTOMER";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
};

export type AppSession = {
  user: SessionUser;
  expiresAt: number;
};
