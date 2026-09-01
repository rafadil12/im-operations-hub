import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

/** Read raw SQL from db/migrations/<filename>. */
export function readMigrationSql(filename) {
  return readFileSync(join(migrationsDir, filename), "utf8");
}
