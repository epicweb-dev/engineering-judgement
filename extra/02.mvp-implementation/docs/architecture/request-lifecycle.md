# Request lifecycle

This document explains how an incoming request moves through the system.

## Entry point

All traffic enters the Worker at `worker/index.ts`.

## Routing order

Requests are handled in this order:

1. Static assets:
   - Served from `ASSETS` for `GET` and `HEAD` when available
2. App server routes:
   - Everything else is handled by `server/handler.ts`

## App server flow

`server/handler.ts` validates environment variables before creating the app
router.

`server/router.ts` maps route patterns from `server/routes.ts` to handler
modules for the scheduling MVP:

- `/` for schedule creation
- `/s/:scheduleKey` for attendee responses
- `/s/:scheduleKey/:hostKey` for host management
- `/health` for health checks
- `/api/schedules*` for the JSON APIs that power those routes

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

The app is designed for same-origin browser and API traffic. There is no custom
CORS layer in `worker/index.ts`; requests are handled directly by the Worker and
app router.
