import { migrate as drizzle_migrate } from "drizzle-orm/aws-data-api/pg/migrator";
import { db } from "./db";

export async function migrate(migrationsFolder: string) {
  return drizzle_migrate(db, { migrationsFolder });
}
