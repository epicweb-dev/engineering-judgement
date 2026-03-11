# Request lifecycle

This document explains how an incoming request moves through the system.

## Entry point

All traffic enters the Worker at `worker/index.ts`.

## Routing order

Requests are handled in this order:

1. Browser noise endpoint:
   - `/.well-known/appspecific/com.chrome.devtools.json` (returns 204)
2. MCP endpoint:
   - `/mcp`
3. Realtime websocket endpoint:
   - `/ws/:shareToken` (proxied to `ScheduleRoom` durable object)
4. SEO crawler endpoints:
   - `/robots.txt`
   - `/sitemap.xml`
5. Static assets:
   - Served from `ASSETS` for `GET` and `HEAD` when available
6. App server routes:
   - Everything else is handled by `server/handler.ts`

## App server flow

`server/handler.ts` validates environment variables then creates the app router.

`server/router.ts` maps route patterns from `server/routes.ts` to handler
modules (home app shell, marketing/SEO pages, schedule APIs, and health).

## Client-side navigation flow

The browser app intercepts same-origin `<a>` clicks and same-origin form
submissions (`GET`/`POST`) and routes them in-place through the client router.
Normal app navigations no longer require a full document refresh.

Full page navigations still occur for:

- Explicit browser reloads/new tab loads
- Cross-origin links/forms
- Non-`_self` form targets (for example, `_blank`)
- Explicit code paths that intentionally call `window.location.assign(...)`

## CORS behavior

`worker/index.ts` wraps the handler with `withCors`:

- CORS headers are added when `Origin` exactly matches the request origin.
- `Origin: null` is allowed for `/api/*` requests (opaque sandbox iframes).
- `https://*.web-sandbox.oaiusercontent.com` is allowed for `/api/*` requests.
- Allowed methods are `GET, POST, OPTIONS`.
- Allowed headers include `content-type` and `authorization`.

This keeps cross-origin behavior narrow while still allowing same-origin browser
and API requests plus sandboxed MCP app API calls.
