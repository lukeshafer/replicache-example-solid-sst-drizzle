import { migrate } from "@app/drizzle"
import { Config } from "sst/node/config";

export const handler = async () => {
  await migrate(Config.MigrationsPath);

  return {
    body: "Migrations completed",
  }
}
