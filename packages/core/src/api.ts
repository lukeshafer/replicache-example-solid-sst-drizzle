import type { DynamoDB } from "@aws-sdk/client-dynamodb"
import { ApiGatewayManagementApi } from "@aws-sdk/client-apigatewaymanagementapi"
import { Table } from "sst/node/table"

async function getWSConnections(dynamoDb: DynamoDB) {
	return dynamoDb.scan({
		TableName: Table.WSConnections.tableName,
		ProjectionExpression: "id",
	})
}

export async function sendPoke(opts: {
	dynamoDb: DynamoDB
	endpoint: string
}) {
	const connections = await getWSConnections(opts.dynamoDb)

	const apiG = new ApiGatewayManagementApi({ endpoint: opts.endpoint })

	for (const item of connections.Items ?? []) {
		console.log("Poking connections:", JSON.stringify(item))
		const id = item.id.S
		if (!id)
			throw new Error(
				"Invalid item in connections table -- should never happen.",
			)

		await apiG
			.postToConnection({ ConnectionId: id, Data: "poke" })
			.catch(async error => {
				console.error("an error occurred", error)
				if (error.statusCode === 410) {
					await opts.dynamoDb.deleteItem({
						TableName: Table.WSConnections.tableName,
						Key: { id: { S: id } },
					})
				}
			})
	}
}
