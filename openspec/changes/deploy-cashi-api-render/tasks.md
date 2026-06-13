# Tasks: Deploy Cashi API to Render

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 180-280 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR with two simple work-unit commits |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Production build/start, Render Blueprint, migration command | PR 1 | Commit: `chore(deploy): add render build and blueprint`; verify build/typecheck/test. |
| 2 | Bruno Production flow plus README/.gitignore docs | PR 1 | Commit: `docs(deploy): document production validation flow`; keep docs and validation together. |

One PR is preferred unless implementation exceeds the 400-line budget.

## Phase 1: Production Build and Scripts

- [x] 1.1 RED: run `yarn build` and confirm production build is currently missing before editing scripts.
- [x] 1.2 Create `tsconfig.build.json` to emit only `src/**/*.ts` into `dist/` with NodeNext settings.
- [x] 1.3 Update `package.json`: add `build`, set `start` to `node dist/index.js`, preserve `prisma:migrate:deploy`.
- [x] 1.4 Acceptance: `yarn build`, `Test-Path dist/index.js`, `yarn typecheck`, `yarn test`, `yarn lint`.

## Phase 2: Render Blueprint and Migration Strategy

- [x] 2.1 Create `render.yaml` with one Node Web Service, one Render Postgres, `/health`, GitHub auto-deploy, and secret-safe env vars.
- [x] 2.2 Configure Render commands: install/generate/build, `preDeployCommand: yarn prisma:migrate:deploy`, and `startCommand: yarn start`.
- [x] 2.3 Document fallback migration path in `README.md`: Render Shell `yarn prisma:migrate:deploy`, or secure local one-off with production `DATABASE_URL`.
- [x] 2.4 Acceptance: inspect `render.yaml` for no plaintext secrets; verify it references `DATABASE_URL`, `JWT_SECRET`, and R2 keys safely.

## Phase 3: Bruno Production Validation

- [x] 3.1 Create `bruno/environments/production.bru` with placeholder `baseUrl` and local/user-managed auth/test variables.
- [x] 3.2 Remove hard-coded localhost `vars:pre-request` overrides from the five affected Bruno requests.
- [x] 3.3 Document Bruno flow in `README.md`: health, register/login, categories, transactions/balance, upload when R2 is configured.
- [x] 3.4 Acceptance: `rg "baseUrl: http://localhost" bruno -g "*.bru"` returns only `bruno/environments/local.bru`.

## Phase 4: Documentation, Hygiene, Verification

- [x] 4.1 Update `.gitignore` for `.env.*` with `!.env.example`, private Bruno secret material, and generated outputs.
- [x] 4.2 Update `README.md` with Render URL placeholder, setup checklist, auto-deploy commit SHA evidence, `/health` smoke command, and preserve AI declaration.
- [x] 4.3 Final local acceptance: `yarn build; if ($?) { yarn typecheck }; if ($?) { yarn test }; if ($?) { yarn lint }`.
- [x] Verification remediation: production `/health` fails with 503 when required database configuration is missing, invalid, or unreachable.
- [ ] 4.4 Post-deploy acceptance: `curl.exe "$env:RENDER_URL/health"`, confirm Render commit SHA, and run Bruno Production flow.
