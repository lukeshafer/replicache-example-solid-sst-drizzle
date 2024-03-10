import type { SSTConfig } from "sst";
import { Site } from "./stacks/site";
import { Database } from "./stacks/database";
import { Api } from "./stacks/api";

export default {
  config() {
    return {
      name: "local-first-todo-app",
      region: "us-east-2",
    }
  },
  stacks(app) {
    app
      .stack(Database)
      .stack(Api)
      .stack(Site)
  }
} satisfies SSTConfig

