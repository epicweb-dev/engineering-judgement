import { type BuildAction } from '#server/build-action.ts'
import { type routes } from '#server/routes.ts'
import { createAuthPageHandler } from './auth-page.ts'

export const login = createAuthPageHandler() satisfies BuildAction<
	typeof routes.login.method,
	typeof routes.login.pattern
>
