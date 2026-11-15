import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "file:./data/talk.db";
if (url.startsWith("file:")) {
  mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });
}

const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
const database = drizzle(client, { schema });

let ready: Promise<void> | null = null;

/** Renvoie la base, après avoir appliqué les migrations au premier appel. */
export async function getDb() {
  ready ??= migrate(database, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await ready;
  return database;
}

export { schema };

/** Utilisateur unique tant que les comptes ne sont pas en place. */
export const LOCAL_USER_ID = "local";
