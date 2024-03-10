import { and, eq, gt } from "drizzle-orm"
import { message, replicache_client, replicache_server } from "./drizzle/schema"
import type { Transaction } from "./drizzle/db"
import { serverID } from "./drizzle/db"

import type {
	MutationV1,
	PatchOperation,
	PullResponse,
	PullResponseOKV1,
} from "replicache"
import type { MessageWithID } from "./types"

export async function processPull(opts: {
	tx: Transaction
	fromVersion: number
	clientGroupID: string
}): Promise<PullResponseOKV1> {
	const { tx, fromVersion, clientGroupID } = opts

	const [result] = await tx
		.select({ version: replicache_server.version })
		.from(replicache_server)
		.where(eq(replicache_server.id, serverID))

	const currentVersion = result?.version || 0

	if (fromVersion > currentVersion) {
		// Should never happen
		throw new Error(`
      Mutation ${fromVersion} is from the future -- aborting.
      This can happen in development if the server restarts. 
      In that case, clear appliation data in browser and refresh.
    `)
	}

	const lastMutationIDChanges = await getLastMutationIDChanges({
		tx,
		clientGroupID,
		fromVersion,
	})

	const changed = await tx
		.select({
			id: message.id,
			sender: message.sender,
			content: message.content,
			order: message.order,
			version: message.version,
			deleted: message.deleted,
		})
		.from(message)
		.where(gt(message.version, fromVersion))

	// Build and return response
	const patch: Array<PatchOperation> = []
	for (const row of changed) {
		if (row.deleted) {
			if (row.version > fromVersion) {
				patch.push({
					op: "del",
					key: `message/${row.id}`,
				})
			}
		} else {
			patch.push({
				op: "put",
				key: `message/${row.id}`,
				value: {
					from: row.sender,
					content: row.content,
					order: row.order,
				},
			})
		}
	}

	const pullResponse: PullResponse = {
		lastMutationIDChanges: lastMutationIDChanges ?? {},
		cookie: currentVersion,
		patch,
	}

	return pullResponse
}

async function getLastMutationIDChanges({
	tx,
	clientGroupID,
	fromVersion,
}: {
	tx: Transaction
	clientGroupID: string
	fromVersion: number
}): Promise<Record<string, number>> {
	const rows = await tx
		.select({
			id: replicache_client.id,
			lastMutationId: replicache_client.last_mutation_id,
		})
		.from(replicache_client)
		.where(
			and(
				eq(replicache_client.client_group_id, clientGroupID),
				gt(replicache_client.version, fromVersion),
			),
		)

	return Object.fromEntries(rows.map(r => [r.id, r.lastMutationId] as const))
}

export async function processMutation(opts: {
	mutation: MutationV1
	clientGroupID: string
	tx: Transaction
	error?: string | undefined
}) {
	const { mutation, clientGroupID, tx, error } = opts
	const { clientID } = mutation

	const [prevVersion] = await tx
		.select({ version: replicache_server.version })
		.from(replicache_server)
		.where(eq(replicache_server.id, serverID))

	const nextVersion = (prevVersion?.version ?? 0) + 1

	const lastMutationId = await getLastMutationID(tx, clientID)
	const nextMutationId = lastMutationId + 1

	console.log({ nextVersion, nextMutationId })

	if (mutation.id < nextMutationId) {
		console.log(
			`Mutation ${mutation.id} has already been processed -- skipping.`,
		)
		return
	}

	if (mutation.id > nextMutationId) {
		throw new Error(`
      Mutation ${mutation.id} is from the future -- aborting.
      This can happen in development if the server restarts. 
      In that case, clear appliation data in browser and refresh.
    `)
	}

	if (error === undefined) {
		console.log("Processing mutation: ", JSON.stringify(mutation))

		switch (mutation.name) {
			case "createMessage":
				await createMessage(tx, mutation.args as MessageWithID, nextVersion)
				break
			default:
				throw new Error(`Unknown mutation: ${mutation.name}`)
		}
	} else {
		console.log("Handling error from mutation", JSON.stringify(mutation), error)
	}

	console.log("setting", clientID, "last_mutation_id to", nextMutationId)

	await setLastMutationID({
		tx,
		clientID,
		clientGroupID,
		mutationID: nextMutationId,
		version: nextVersion,
	})

	await tx
		.update(replicache_server)
		.set({ version: nextVersion })
		.where(eq(replicache_server.id, serverID))
}

async function getLastMutationID(
	tx: Transaction,
	clientID: string,
): Promise<number> {
	const [clientRow] = await tx
		.select({ lastMutationId: replicache_client.last_mutation_id })
		.from(replicache_client)
		.where(eq(replicache_client.id, clientID))

	if (!clientRow) {
		return 0
	}

	return clientRow.lastMutationId
}

async function setLastMutationID(opts: {
	tx: Transaction
	clientID: string
	clientGroupID: string
	mutationID: number
	version: number
}) {
	const { tx, clientID, clientGroupID, mutationID, version } = opts

	const result = await tx
		.update(replicache_client)
		.set({
			client_group_id: clientGroupID,
			last_mutation_id: mutationID,
			version,
		})
		.where(eq(replicache_client.id, clientID))

	if (!result.numberOfRecordsUpdated) {
		await tx.insert(replicache_client).values({
			id: clientID,
			client_group_id: clientGroupID,
			last_mutation_id: mutationID,
			version,
		})
	}
}

async function createMessage(
	tx: Transaction,
	{ id, from, order, content }: MessageWithID,
	nextVersion: number,
) {
	await tx.insert(message).values({
		id,
		sender: from,
		content,
		order,
		deleted: false,
		version: nextVersion,
	})

	// TODO: implement
}
