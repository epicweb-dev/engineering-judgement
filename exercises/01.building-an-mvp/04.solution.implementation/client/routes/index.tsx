import { AccountRoute } from './account.tsx'
import { ChatRoute } from './chat.tsx'
import { EventRoute } from './event.tsx'
import { HostRoute } from './host.tsx'
import { HomeRoute } from './home.tsx'
import { LoginRoute } from './login.tsx'
import { OAuthAuthorizeRoute } from './oauth-authorize.tsx'
import { OAuthCallbackRoute } from './oauth-callback.tsx'
import { ResetPasswordRoute } from './reset-password.tsx'

export const clientRoutes = {
	'/': <HomeRoute />,
	'/event/:eventId': <EventRoute />,
	'/host/:eventId': <HostRoute />,
	'/chat': <ChatRoute />,
	'/account': <AccountRoute />,
	'/login': <LoginRoute />,
	'/signup': <LoginRoute setup={{ initialMode: 'signup' }} />,
	'/reset-password': <ResetPasswordRoute />,
	'/oauth/authorize': <OAuthAuthorizeRoute />,
	'/oauth/callback': <OAuthCallbackRoute />,
}
