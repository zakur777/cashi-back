# Design: Deploy Cashi API to Render

## Technical Approach

Add deployment readiness only: a Render Blueprint for one Node Web Service plus Render Postgres, production build/start scripts that run compiled JS, Prisma migration deployment, Bruno production validation, and README/.gitignore documentation. This maps to `production-deployment` and `production-validation-docs` without changing API behavior.

## Current-State Findings

- `package.json` has `start: node src/index.ts`, no `build`, and Prisma scripts already include `prisma:migrate:deploy`.
- `tsconfig.json` has no `outDir` and includes `tests`, `vitest.config.ts`, and `prisma.config.ts`; using it for production emit would pollute source/test folders.
- `src/index.ts` reads `process.env.PORT ?? 3000`, exports `app`, and only calls `serve` when run as the entrypoint; compiled `dist/index.js` is compatible.
- Prisma reads `DATABASE_URL` from env through `prisma/schema.prisma` and `prisma.config.ts`; committed migrations exist under `prisma/migrations/`.
- Bruno already uses `{{baseUrl}}`, but five request files override `baseUrl` to localhost in `vars:pre-request`, which would break a Production environment.
- README is Spanish and already contains the AI usage declaration; `.gitignore` ignores `.env`, `dist/`, and `node_modules/` but not `.env.*` or private Bruno material.

## Architecture Decisions

| Topic | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Build output | Add `tsconfig.build.json` and `build: tsc -p tsconfig.build.json`; set `start: node dist/index.js`. | Use current `tsconfig`; run TS source with `tsx`. | Current config includes tests and has no `outDir`; production must run compiled output, not TS source. |
| Render config | Commit root `render.yaml` with `runtime: node`, `healthCheckPath: /health`, `autoDeployTrigger: commit`, `DATABASE_URL` from Render Postgres, `JWT_SECRET: generateValue`, R2 vars as `sync: false`. | Manual dashboard-only setup. | Blueprint is reviewable, repeatable, and avoids committed secrets. |
| Migrations | Use `preDeployCommand: yarn prisma:migrate:deploy`. | Run migrations inside `start`. | Pre-deploy blocks bad releases before traffic; start-time migrations can race across instances. |
| Migration fallback | Document Render Shell one-off `yarn prisma:migrate:deploy`; if Shell is unavailable, run locally once with production `DATABASE_URL` copied securely and never committed. | Skip migrations. | Specs require a safe fallback if pre-deploy is unavailable. |
| Bruno production | Add `bruno/environments/production.bru`; remove hard-coded localhost pre-request overrides; keep tokens/test IDs as local/user-managed values. | Duplicate request files for production. | One collection stays environment-driven and avoids secret drift. |

## Data Flow

```text
GitHub push -> Render Blueprint sync -> yarn install --production=false
  -> prisma generate -> tsc build -> prisma migrate deploy
  -> node dist/index.js -> /health + Bruno/curl smoke tests
                         -> Prisma -> Render Postgres
                         -> R2 env vars -> Cloudflare R2 upload path
```

## File Changes

| File | Action | Description |
|---|---|---|
| `render.yaml` | Create | Web Service, Postgres, env var references, build/start/pre-deploy commands, health check. |
| `package.json` | Modify | Add `build`; change `start` to compiled JS; keep `prisma:migrate:deploy`. |
| `tsconfig.build.json` | Create | Emit only `src/**/*.ts` to `dist/` with NodeNext module settings. |
| `bruno/environments/production.bru` | Create | Shareable Production environment with placeholder `baseUrl` and non-secret placeholders. |
| `bruno/**/*.bru` | Modify | Remove localhost `vars:pre-request` overrides so environment `baseUrl` controls targets. |
| `.gitignore` | Modify | Ignore `.env.*` with `!.env.example`, private Bruno env/secret files, generated outputs. |
| `README.md` | Modify | Add Render deployment, production URL placeholder, migration fallback, Bruno validation, auto-deploy evidence; preserve AI declaration. |

## Interfaces / Contracts

Render build/start contract: `buildCommand: yarn install --frozen-lockfile --production=false && yarn prisma:generate && yarn build`; `preDeployCommand: yarn prisma:migrate:deploy`; `startCommand: yarn start`. The app must bind Render-provided `PORT` and expose `GET /health -> {"status":"ok"}`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit/integration | Existing API behavior remains unchanged. | Strict TDD commands: `yarn test`, `yarn typecheck`, `yarn lint`. |
| Build | Production entry exists and starts from compiled output. | Run `yarn build`; verify `dist/index.js`; optionally smoke locally with production-like env. |
| Deployment smoke | Render URL, DB, migrations, env vars. | After deploy: `curl $RENDER_URL/health`; Bruno Production flow: health, register/login, categories, transactions/balance, upload if R2 configured. |

## Migration / Rollout

Apply Blueprint from GitHub, set required `sync: false` R2 values, let `preDeployCommand` run committed migrations, then validate `/health` and Bruno flow. If migration fails, treat deploy as failed, inspect Render logs, fix/redeploy; manual rollback is required for destructive DB changes.

## Commit / PR Plan

One PR with simple work-unit commits: `chore(deploy): add render build and blueprint`, then `docs(deploy): document production validation flow`. Keep docs with deployment workflow, monitor changed lines against the 400-line review budget, and ask before chained PRs if forecast grows.

## Open Questions

- [ ] Final Render public URL is assigned only after service creation; README should use a placeholder until deployment.
