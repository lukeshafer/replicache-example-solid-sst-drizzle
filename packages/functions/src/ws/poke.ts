import { DynamoDB } from "@aws-sdk/client-dynamodb"
import { WebSocketApiHandler, useRequestContext } from "sst/node/websocket-api"
import { sendPoke } from "@app/api"

const dynamoDb = new DynamoDB()

export const handler = WebSocketApiHandler(async () => {
	const { stage, domainName } = useRequestContext()
	await sendPoke({ dynamoDb, endpoint: `https://${domainName}/${stage}` })
	return { statusCode: 200, body: "Poke sent." }
})
