import { type RemixElement, type RemixNode } from './index.js'

export declare const Fragment: unique symbol
export declare function jsx(
	type: unknown,
	props: unknown,
	key?: unknown,
): RemixElement
export declare function jsxs(
	type: unknown,
	props: unknown,
	key?: unknown,
): RemixElement
export declare function jsxDEV(
	type: unknown,
	props: unknown,
	key?: unknown,
): RemixElement

type LegacyEventHandler = (event: any, signal: AbortSignal) => unknown

type LegacyElementProps = {
	[key: string]: unknown
	children?: RemixNode
	css?: Record<string, unknown>
	on?: Record<string, LegacyEventHandler | undefined | null | false>
}

declare global {
	namespace JSX {
		type Element = RemixElement
		type ElementType = string | ((...args: Array<any>) => unknown)
		type ElementChildrenAttribute = { children: unknown }
		type LibraryManagedAttributes<component, props> = LegacyElementProps
		interface IntrinsicAttributes {
			key?: unknown
			setup?: unknown
		}
		interface IntrinsicElements {
			[elementName: string]: LegacyElementProps
		}
	}
}

export type { RemixElement, RemixNode }
