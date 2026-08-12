import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * The database client.
 *
 * Prisma 7 connects through a driver adapter rather than a URL in the schema.
 * SQLite is the default because lokal is meant to be self-hosted on a small VM
 * by the kind of organization it advises; PostgreSQL is a provider swap plus
 * `Json` -> `Jsonb`, with no query surface to port.
 *
 * The instance is cached on `globalThis` so that hot reloading in development
 * does not open a new connection on every edit.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

export const db: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
