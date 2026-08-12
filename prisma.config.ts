import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer reads .env by itself. Node's built-in loader avoids adding
// a dotenv dependency just to run migrations.
try {
  process.loadEnvFile();
} catch {
  // No .env present — fall back to the ambient environment, which is how CI and
  // container deployments supply DATABASE_URL anyway.
}

/**
 * Prisma 7 moved connection URLs out of `schema.prisma` and into this file.
 * The application client connects through a driver adapter (see `src/lib/db.ts`);
 * this configuration is what the migration and introspection commands use.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
