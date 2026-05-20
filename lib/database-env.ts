const vercelPostgresUrlKeys = ["POSTGRES_PRISMA_URL", "POSTGRES_URL", "POSTGRES_URL_NON_POOLING"] as const;

type DatabaseEnv = NodeJS.ProcessEnv;

function isUsableEnvValue(value: string | undefined) {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.length > 2 && trimmed !== "\"\"" && trimmed !== "''";
}

function encodeConnectionPart(value: string) {
  return encodeURIComponent(value);
}

function resolvePostgresUrlFromParts(env: DatabaseEnv) {
  const { POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DATABASE } = env;
  if (
    !isUsableEnvValue(POSTGRES_HOST) ||
    !isUsableEnvValue(POSTGRES_USER) ||
    !isUsableEnvValue(POSTGRES_PASSWORD) ||
    !isUsableEnvValue(POSTGRES_DATABASE)
  ) {
    return undefined;
  }

  const user = encodeConnectionPart(POSTGRES_USER!);
  const password = encodeConnectionPart(POSTGRES_PASSWORD!);
  const database = encodeConnectionPart(POSTGRES_DATABASE!);

  return `postgresql://${user}:${password}@${POSTGRES_HOST}:5432/${database}?schema=public&sslmode=require`;
}

export function resolvePrismaDatabaseUrl(env: DatabaseEnv = process.env) {
  if (isUsableEnvValue(env.DATABASE_URL)) return env.DATABASE_URL;

  const vercelUrl = vercelPostgresUrlKeys.map((key) => env[key]).find(isUsableEnvValue);
  return vercelUrl || resolvePostgresUrlFromParts(env);
}

export function ensurePrismaDatabaseUrl(env: DatabaseEnv = process.env) {
  if (!isUsableEnvValue(env.DATABASE_URL)) {
    const databaseUrl = resolvePrismaDatabaseUrl(env);
    if (databaseUrl) {
      env.DATABASE_URL = databaseUrl;
    }
  }

  return env.DATABASE_URL;
}
