import {
	type MutatorDefs,
	type ReadTransaction,
	Replicache,
	type WriteTransaction,
} from "replicache"
import { createStore } from "solid-js/store"
import { type Accessor, createSignal } from "solid-js"
import type { MessageWithID } from "@app/types"

const API_URL = import.meta.env.VITE_API_URL
const LICENSE_KEY = import.meta.env.VITE_REPLICACHE_LICENSE_KEY
const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL

export function createReplicache() {
	const replicache = new Replicache({
		name: "chat-user-id",
		licenseKey: LICENSE_KEY,
		pullURL: API_URL + "/replicache-pull",
		pushURL: API_URL + "/replicache-push",
		mutators: {
			async createMessage(
				tx: WriteTransaction,
				{ id, ...message }: MessageWithID,
			) {
				await tx.set(`message/${id}`, message)
			},
		},
	})

	const ws = new WebSocket(WEBSOCKET_URL)
	ws.onmessage = ev => {
		if (typeof ev.data === "string" && ev.data.toLowerCase() === "poke") {
			console.debug("got poked!")
			replicache.pull()
		}
	}

	window.onbeforeunload = () => ws.close()

	return replicache
}

export function createSubscriptionSignal<T>(
	rep: Replicache,
	subscriptionFunction: (tx: ReadTransaction) => Promise<T>,
	options: { default: T },
): Accessor<T> {
	const [signal, setSignal] = createSignal<T>(options.default)
	rep.subscribe(
		async tx => {
			subscriptionFunction(tx).then(result => setSignal(() => result))
		},
		() => {},
	)

	return signal
}

export function createSubscriptionStore<
	T extends object,
	R extends MutatorDefs,
>(
	rep: Replicache<R>,
	subscriptionFunction: (tx: ReadTransaction) => Promise<T>,
	options: { default: T },
): T {
	const [store, setStore] = createStore<T>(options.default)
	rep.subscribe(
		async tx => {
			subscriptionFunction(tx).then(result => setStore(() => result))
		},
		() => {},
	)

	return store
}
