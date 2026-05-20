import { describe, expect, it } from "vitest";
import { ensurePrismaDatabaseUrl, resolvePrismaDatabaseUrl } from "@/lib/database-env";

describe("database environment resolution", () => {
  it("keeps an explicitly configured DATABASE_URL", () => {
    const env = {
      DATABASE_URL: "postgresql://local/database",
      POSTGRES_PRISMA_URL: "postgresql://vercel/pooled"
    } as unknown as NodeJS.ProcessEnv;

    expect(resolvePrismaDatabaseUrl(env)).toBe("postgresql://local/database");
    expect(ensurePrismaDatabaseUrl(env)).toBe("postgresql://local/database");
  });

  it("uses Vercel pooled Postgres URL when DATABASE_URL is not configured", () => {
    const env = {
      POSTGRES_PRISMA_URL: "postgresql://vercel/pooled"
    } as unknown as NodeJS.ProcessEnv;

    expect(ensurePrismaDatabaseUrl(env)).toBe("postgresql://vercel/pooled");
    expect(env.DATABASE_URL).toBe("postgresql://vercel/pooled");
  });

  it("falls back to the general Vercel Postgres URL", () => {
    const env = {
      POSTGRES_URL: "postgresql://vercel/general"
    } as unknown as NodeJS.ProcessEnv;

    expect(resolvePrismaDatabaseUrl(env)).toBe("postgresql://vercel/general");
  });

  it("returns undefined when no supported database URL is configured", () => {
    expect(resolvePrismaDatabaseUrl({} as NodeJS.ProcessEnv)).toBeUndefined();
  });
});
