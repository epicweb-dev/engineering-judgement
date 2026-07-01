export type RemixElement = {
	type: string | Function
	props: Record<string, unknown>
	key?: unknown
	$rmx: true
}

export type Renderable =
	| RemixElement
	| string
	| number
	| bigint
	| boolean
	| null
	| undefined
export type RemixNode = Renderable | Array<RemixNode>
export type Task = (signal: AbortSignal) => void | Promise<void>

export interface Handle<Props = Record<string, never>, ContextValue = unknown> {
	id: string
	props: Props
	context: {
		set(values: ContextValue): void
		get(component: unknown): unknown
	}
	update(): Promise<AbortSignal>
	queueTask(task: Task): void
	frame: unknown
	frames: {
		readonly top: unknown
		get(name: string): unknown
	}
	signal: AbortSignal
}

export declare function createRoot(
	container: Element,
	options?: Record<string, unknown>,
): {
	render(element: RemixNode): void
	dispose(): void
	flush(): void
}
