import { type StackContext, StaticSite, use, Config } from "sst/constructs"
import { Api } from "./api"

export function Site({ app, stack }: StackContext) {
	const { api, wsApi } = use(Api)

	const site = new StaticSite(stack, "Site", {
		path: "packages/site",
		buildOutput: "dist",
		buildCommand: "pnpm run build",
		environment: {
			VITE_API_URL: api.url,
			VITE_WEBSOCKET_URL: wsApi.url,
		},
	})

	stack.addOutputs({
		SiteURL: site.url,
	})
}
