# Architecture overview

This folder documents the important runtime architecture for `epic-scheduler`.

## Core docs

- [Request Lifecycle](./request-lifecycle.md): how requests are routed in the
  Worker.
- [Data Storage](./data-storage.md): what is stored in D1 for schedules and
  attendee availability.

## Source of truth in code

- Worker entrypoint: `worker/index.ts`
- Server request handler: `server/handler.ts`
- Router and HTTP route mapping: `server/router.ts` and `server/routes.ts`
