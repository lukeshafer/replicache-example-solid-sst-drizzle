import { WebSocketApiHandler } from "sst/node/websocket-api"
import { DynamoDB } from "@aws-sdk/client-dynamodb"
import { Table } from "sst/node/table"

const dynamoDb = new DynamoDB()

export const handler = WebSocketApiHandler(async event => {
	await dynamoDb.deleteItem({
		TableName: Table.WSConnections.tableName,
		Key: {
			id: {
				S: event.requestContext.connectionId,
			},
		},
	})

	return { statusCode: 200, body: "Disconnected" }
})
