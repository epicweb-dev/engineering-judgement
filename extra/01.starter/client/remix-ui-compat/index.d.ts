export type RemixElement = {
	type: string | Function
	props: Record<string, any>
	key?: any
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
export type Handle<
	Props = Record<string, never>,
	ContextValue = Record<string, never>,
> = any

export declare function createRoot(
	container: Element,
	options?: Record<string, unknown>,
): {
	render(element: RemixNode): void
	dispose(): void
	flush(): void
}
