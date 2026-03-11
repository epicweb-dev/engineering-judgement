# Architecture overview

This folder documents the important runtime architecture for `epic-scheduler`.

## Core docs

- [Request Lifecycle](./request-lifecycle.md): how requests are routed in the
  Worker.
- [Access Model](./authentication.md): link-based participation and MCP access.
- [Data Storage](./data-storage.md): what is stored in D1 and Durable Objects.

## Source of truth in code

- Worker entrypoint: `worker/index.ts`
- Server request handler: `server/handler.ts`
- Router and HTTP route mapping: `server/router.ts` and `server/routes.ts`
- SEO/marketing content map: `server/seo-content.ts`
- Scheduler persistence logic: `shared/schedule-store.ts`
- Realtime schedule DO: `worker/schedule-room.ts`
