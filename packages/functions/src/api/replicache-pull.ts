import type { PullRequestV1 } from "replicache"
import { ApiHandler, Response, useJsonBody } from "sst/node/api"
import { db } from "@app/drizzle"
import { processPull } from "@app/replicache"

export const handler = ApiHandler(async () => {
	const pull = useJsonBody() as PullRequestV1
	console.log("Processing pull", JSON.stringify(pull))
	const { clientGroupID, cookie: fromVersion = 0 } = pull

	const t0 = Date.now()

	try {
		// Read all data in a single transaction so it's consistent
		await db.transaction(async tx => {
			const body = await processPull({
				tx,
				clientGroupID,
				fromVersion: Number(fromVersion || 0),
			})
			console.log(JSON.stringify(body))

			throw new Response({ statusCode: 200, body: JSON.stringify(body) })
		})
	} catch (error) {
		if (error instanceof Response) {
			// Caught a response -- let it pass
			throw error
		} else {
			console.error("Uncaught error:", JSON.stringify(error), error)
			throw new Response({ statusCode: 500, body: JSON.stringify(error) })
		}
	} finally {
		console.log("Processed pull in", Date.now() - t0)
	}
})
