import { type Action } from 'remix/fetch-router'
import { type BuildRoute, type RequestMethod } from 'remix/fetch-router/routes'
import { type RoutePattern } from 'remix/route-pattern'

export type BuildAction<
	method extends RequestMethod | 'ANY',
	pattern extends string | RoutePattern,
> = Action<BuildRoute<method, pattern>>
