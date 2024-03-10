import { ApiHandler, useJsonBody, Response } from "sst/node/api"
import type { PushRequestV1 } from "replicache"
import { db } from "../../../core/src/drizzle/db"
import { processMutation } from "../../../core/src/replicache"
import { sendPoke } from "@app/api"
import { WebSocketApi } from "sst/node/websocket-api"
import { DynamoDB } from "@aws-sdk/client-dynamodb"

const dynamoDb = new DynamoDB()

export const handler = ApiHandler(async () => {
	const push: PushRequestV1 = useJsonBody()
	console.log("processing push", { push })

	// TODO: rename this to a better name
	const t0 = Date.now()

	try {
		for (const mutation of push.mutations) {
			const t1 = Date.now()

			try {
				await db.transaction(async tx =>
					processMutation({
						tx,
						clientGroupID: push.clientGroupID,
						mutation,
					}),
				)
			} catch (error) {
				console.error("Caught error from mutation", mutation, error)

				await db.transaction(async tx =>
					processMutation({
						tx,
						clientGroupID: push.clientGroupID,
						mutation,
						error: String(error),
					}),
				)
			} finally {
				console.log("Processed mutation in", Date.now() - t1)
			}
		}
	} catch (e) {
		console.error(e)
		throw new Response({
			body: String(e),
			statusCode: 500,
		})
	} finally {
		await sendPoke({ dynamoDb, endpoint: WebSocketApi.WSApi.httpsUrl })
		console.log("Processed push in", Date.now() - t0)
	}
})
