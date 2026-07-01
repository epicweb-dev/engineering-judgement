import { type RemixElement, type RemixNode } from './index.js'

export declare const Fragment: unique symbol
export declare function jsx(type: any, props: any, key?: any): RemixElement
export declare function jsxs(type: any, props: any, key?: any): RemixElement
export declare function jsxDEV(type: any, props: any, key?: any): RemixElement

declare global {
	namespace JSX {
		type Element = RemixElement
		type ElementType = any
		type ElementChildrenAttribute = { children: any }
		interface IntrinsicAttributes {
			[key: string]: any
		}
		interface ElementAttributesProperty {
			props: any
		}
		interface IntrinsicElements {
			[elementName: string]: any
		}
	}
}

export type { RemixElement, RemixNode }
