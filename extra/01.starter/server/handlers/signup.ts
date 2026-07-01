import { type BuildAction } from '#server/build-action.ts'
import { type routes } from '#server/routes.ts'
import { createAuthPageHandler } from './auth-page.ts'

export const signup = createAuthPageHandler() satisfies BuildAction<
	typeof routes.signup.method,
	typeof routes.signup.pattern
>
