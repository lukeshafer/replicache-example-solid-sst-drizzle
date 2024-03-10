import type { StackContext } from "sst/constructs"
import { Api as ApiConstruct, Table, WebSocketApi, use } from "sst/constructs"
import { Database } from "./database"

export function Api({ stack }: StackContext) {
	const { rds } = use(Database)

	const wsConnections = new Table(stack, "WSConnections", {
		fields: {
			id: "string",
		},
		primaryIndex: { partitionKey: "id" },
	})

	const wsApi = new WebSocketApi(stack, "WSApi", {
		defaults: {
			function: {
				bind: [wsConnections],
			},
		},
		routes: {
			$connect: "packages/functions/src/ws/connect.handler",
			$disconnect: "packages/functions/src/ws/disconnect.handler",
			poke: "packages/functions/src/ws/poke.handler",
		},
	})

	const api = new ApiConstruct(stack, "Api", {
		routes: {
			"POST /replicache-pull":
				"packages/functions/src/api/replicache-pull.handler",
			"POST /replicache-push":
				"packages/functions/src/api/replicache-push.handler",
		},
		defaults: {
			function: {
				bind: [rds, wsApi, wsConnections],
			},
		},
	})

	stack.addOutputs({
		ApiUrl: api.url,
		WebSocketApiUrl: wsApi.url,
	})

	return { api, wsApi }
}
