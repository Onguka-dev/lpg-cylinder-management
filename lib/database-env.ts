const vercelPostgresUrlKeys = ["POSTGRES_PRISMA_URL", "POSTGRES_URL", "POSTGRES_URL_NON_POOLING"] as const;

type DatabaseEnv = NodeJS.ProcessEnv;

export function resolvePrismaDatabaseUrl(env: DatabaseEnv = process.env) {
  return env.DATABASE_URL || vercelPostgresUrlKeys.map((key) => env[key]).find(Boolean);
}

export function ensurePrismaDatabaseUrl(env: DatabaseEnv = process.env) {
  if (!env.DATABASE_URL) {
    const databaseUrl = resolvePrismaDatabaseUrl(env);
    if (databaseUrl) {
      env.DATABASE_URL = databaseUrl;
    }
  }

  return env.DATABASE_URL;
}
