import { type StackContext, RDS, Script, Config } from "sst/constructs";

export function Database({ stack }: StackContext) {
  const rds = new RDS(stack, "Database", {
    engine: "postgresql13.9",
    defaultDatabaseName: "todo_database",
  })

  const MigrationsPath = new Config.Parameter(stack, "MigrationsPath", { value: "migrations" })

  new Script(stack, "migrations", {
    defaults: {
      function: {
        bind: [rds, MigrationsPath],
        copyFiles: [
          {
            from: "packages/core/migrations",
            to: MigrationsPath.value,
          }
        ]
      }
    },
    onCreate: "packages/functions/src/migrate-db.handler",
    onUpdate: "packages/functions/src/migrate-db.handler",
  })

  stack.addOutputs({
    RDS_DATABASE: rds.defaultDatabaseName,
  })

  return {
    rds
  }
}
