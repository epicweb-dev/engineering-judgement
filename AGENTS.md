It's not your typical project.

This project is an Epic Workshop implementation. Check [./instructor/README.md](./instructor/README.md) for more details.

## Cursor Cloud specific instructions

### Node.js version

The project requires **Node.js v24+** (`engines.node` in root and exercise `package.json`). The VM snapshot has Node 24 installed via `nvm`. If `node --version` shows < 24, run `nvm use 24`.

### Duplicate workspace names

Both the problem and solution exercises may share the same `name` in their `package.json`. Run `node epicshop/fix.ts` from the repo root before `npm install` to fix duplicate workspace names. The update script handles this automatically.

### Exercise `node_modules` symlink

npm workspaces hoists all dependencies to `/workspace/node_modules`. Exercise directories under `exercises/` do not get their own `node_modules`. Tools like `oxlint` that resolve configs relative to the exercise directory (e.g., `./node_modules/@epic-web/config/...`) will fail without a symlink. The update script creates `node_modules -> /workspace/node_modules` symlinks for each exercise.

### Running the exercise app

The primary exercise is at `exercises/01.building-an-mvp/04.problem.implementation/`. See its `docs/agents/setup.md` for full local dev commands. Key steps:

1. Ensure `.env` exists (copy from `.env.example` if missing).
2. Run migrations: `npm run migrate:local`
3. Seed test user: use wrangler directly with `--env production` flag since the seed script may fail without it. Credentials: `kody@kcd.dev` / `kodylovesyou`.
4. Start the dev server: `npm run dev` (starts worker, client, and mock Resend server). App runs on port 3742.

### Running the EpicShop workshop runner

From the repo root: `npm run start` or `npm run dev`. Serves on port 5639.

### Lint / Build / Typecheck

- Root lint: `npm run lint` (uses `.oxlintrc.json`)
- Exercise lint: `npm run lint` from the exercise directory
- Exercise build: `npm run build` from the exercise directory
- Exercise typecheck: `npm run typecheck` from the exercise directory

### Wrangler env wrapper

The exercise uses `node ./wrangler-env.ts` instead of bare `wrangler` to inject `--env production` automatically. When calling wrangler commands directly (not through npm scripts), always pass `--env production`.
