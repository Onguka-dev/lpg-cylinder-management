import { spawnSync } from "node:child_process";

const migrationPostgresUrlKeys = ["POSTGRES_URL_NON_POOLING", "POSTGRES_URL", "POSTGRES_PRISMA_URL"];

function isUsableEnvValue(value) {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.length > 2 && trimmed !== "\"\"" && trimmed !== "''";
}

function resolveDatabaseUrl(env) {
  if (isUsableEnvValue(env.DATABASE_URL)) return env.DATABASE_URL;

  const vercelUrl = migrationPostgresUrlKeys.map((key) => env[key]).find(isUsableEnvValue);
  if (vercelUrl) return vercelUrl;

  if (
    isUsableEnvValue(env.POSTGRES_HOST) &&
    isUsableEnvValue(env.POSTGRES_USER) &&
    isUsableEnvValue(env.POSTGRES_PASSWORD) &&
    isUsableEnvValue(env.POSTGRES_DATABASE)
  ) {
    const user = encodeURIComponent(env.POSTGRES_USER);
    const password = encodeURIComponent(env.POSTGRES_PASSWORD);
    const database = encodeURIComponent(env.POSTGRES_DATABASE);
    return `postgresql://${user}:${password}@${env.POSTGRES_HOST}:5432/${database}?schema=public&sslmode=require`;
  }

  return undefined;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.env.VERCEL !== "1" && process.env.RUN_VERCEL_DB_PREP !== "1") {
  process.exit(0);
}

const databaseUrl = resolveDatabaseUrl(process.env);
if (!databaseUrl) {
  console.error("Vercel database preparation failed: no usable production Postgres environment variables were found.");
  process.exit(1);
}

process.env.DATABASE_URL = databaseUrl;

console.log("Preparing production database with Prisma migrations.");
run("npx", ["prisma", "migrate", "deploy"]);

console.log("Seeding production database with idempotent demo/master data.");
run("npx", ["prisma", "db", "seed"]);
