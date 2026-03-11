# Environment variables

Use this guide when you add a new environment variable to the starter. It keeps
types, runtime validation, and documentation in sync.

## Steps

1. **Add the type**
   - Update `types/env.d.ts` so `Env` includes the new variable.

2. **Validate at runtime**
   - Add the variable to the schema in `types/env-schema.ts`.
   - `server/env.ts` uses the schema to fail fast at runtime.
   - The schema is the single source of truth for validation + types.

   Example:

   ```ts
   const EnvSchema = object({
   	APP_DB: d1DatabaseSchema,
   	APP_BASE_URL: optionalUrlStringSchema,
   	APP_COMMIT_SHA: optionalCommitShaSchema,
   	COOKIE_SECRET: requiredSecretStringSchema,
   })
   ```

3. **Add local defaults**
   - Update `.env.example` (source for new local `.env` files).

4. **Update required resources docs**
   - Add the variable to `docs/setup-manifest.md`.

5. **Sync deploy secrets**
   - Add the variable to the relevant GitHub Actions workflows so it is pushed
     via `wrangler secret put`:
     - `.github/workflows/deploy.yml` (production deploys)
     - `.github/workflows/preview.yml` (preview deploys)

## Why schema validation?

The schema parser gives type inference for `Env`-driven values and a single
runtime gate that fails fast with clear errors. It keeps the “what’s required”
definition in one place.
