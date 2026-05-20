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

  it("builds a connection string from Vercel Postgres parts", () => {
    const env = {
      POSTGRES_HOST: "db.example.test",
      POSTGRES_USER: "demo user",
      POSTGRES_PASSWORD: "pass/word",
      POSTGRES_DATABASE: "wells gas"
    } as unknown as NodeJS.ProcessEnv;

    expect(resolvePrismaDatabaseUrl(env)).toBe(
      "postgresql://demo%20user:pass%2Fword@db.example.test:5432/wells%20gas?schema=public&sslmode=require"
    );
  });

  it("ignores empty quoted provider placeholders", () => {
    const env = {
      POSTGRES_PRISMA_URL: "\"\"",
      POSTGRES_URL: "''",
      POSTGRES_HOST: "db.example.test",
      POSTGRES_USER: "demo",
      POSTGRES_PASSWORD: "secret",
      POSTGRES_DATABASE: "wells"
    } as unknown as NodeJS.ProcessEnv;

    expect(resolvePrismaDatabaseUrl(env)).toBe(
      "postgresql://demo:secret@db.example.test:5432/wells?schema=public&sslmode=require"
    );
  });

  it("returns undefined when no supported database URL is configured", () => {
    expect(resolvePrismaDatabaseUrl({} as NodeJS.ProcessEnv)).toBeUndefined();
  });
});
