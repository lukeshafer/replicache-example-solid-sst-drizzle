import { For, isServer } from "solid-js/web"
import { type JSX } from "solid-js"
import type { Message } from "@app/types"
import { nanoid } from "nanoid"
import { createReplicache, createSubscriptionStore } from "./lib"

if (isServer) throw new Error("should only run on client")

export default function Root(): JSX.Element {
	const replicache = createReplicache()

	const messages = createSubscriptionStore(
		replicache,
		async tx => {
			const list = await tx
				.scan<Message>({ prefix: "message/" })
				.entries()
				.toArray()
			list.sort(([, a], [, b]) => a.order - b.order)
			return list
		},
		{ default: [] },
	)

	return (
		<div class="min-h-screen p-8">
			<MessageList messages={messages} />
			<form
				class="flex gap-3 items-center p-2 justify-center"
				onSubmit={e => {
					e.preventDefault()
					const last = messages.length ? messages[messages.length - 1][1] : null
					const order = (last?.order ?? 0) + 1

					const form = e.currentTarget,
						username = form.username.value,
						content = form.content.value

					replicache.mutate.createMessage({
						id: nanoid(),
						from: username,
						content: content,
						order,
					})

					form.username.value = ""
					form.content.value = ""
				}}
			>
				<input required name="username" /> says:{" "}
				<input required name="content" />
				<button type="submit" class="outline outline-slate-900 p-2 py-1">
					Submit
				</button>
			</form>
		</div>
	)
}

function MessageList(props: {
	messages: Array<readonly [key: string, Message]>
}) {
	return (
		<ul class="grid justify-center">
			<For each={props.messages}>
				{([, msg]) => (
					<li>
						<b class="m-4">{msg.from}</b>
						{msg.content}
					</li>
				)}
			</For>
		</ul>
	)
}
