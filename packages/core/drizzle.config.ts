import type { Config } from "drizzle-kit"

export default {
  schema: "./src/drizzle/schema.ts",
  out: "./migrations"
} satisfies Config
