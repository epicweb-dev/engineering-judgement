import { css as cssMixin, on as onMixin } from 'remix/ui'
import {
	Fragment,
	jsx as baseJsx,
	jsxDEV as baseJsxDev,
	jsxs as baseJsxs,
} from 'remix/ui/jsx-runtime'

const componentCache = new WeakMap()

function normalizeType(type) {
	if (typeof type !== 'function') return type
	if (type === Fragment || '__rmxMixinElementType' in type) return type

	let cached = componentCache.get(type)
	if (!cached) {
		cached = function LegacyComponent(handle) {
			return type(handle, handle.props?.setup ?? handle.props ?? {})
		}
		Object.defineProperty(cached, 'name', {
			value: type.name ? type.name + 'Compat' : 'LegacyComponent',
		})
		componentCache.set(type, cached)
	}

	return cached
}

function normalizeMixValue(mix) {
	if (mix === undefined || mix === null || mix === false) return []
	return Array.isArray(mix) ? [...mix] : [mix]
}

function normalizeLegacyOn(on) {
	if (!on || typeof on !== 'object') return []

	return Object.entries(on)
		.filter(([, handler]) => typeof handler === 'function')
		.map(([type, handler]) =>
			onMixin(type, (event, signal) => handler(event, signal)),
		)
}

function normalizeProps(props) {
	if (!props || typeof props !== 'object') return props

	let { css, on, mix, ...rest } = props
	let nextMix = normalizeMixValue(mix)
	if (css) nextMix.push(cssMixin(css))
	nextMix.push(...normalizeLegacyOn(on))

	if (nextMix.length === 0) return rest
	return { ...rest, mix: nextMix }
}

export { Fragment }

export function jsx(type, props, key) {
	return baseJsx(normalizeType(type), normalizeProps(props), key)
}

export function jsxs(type, props, key) {
	return baseJsxs(normalizeType(type), normalizeProps(props), key)
}

export function jsxDEV(type, props, key) {
	return baseJsxDev(normalizeType(type), normalizeProps(props), key)
}
