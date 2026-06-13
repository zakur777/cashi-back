# Proposal: Deploy Cashi API to Render

## Intent

Make the Cashi API publicly available on Render using managed PostgreSQL, repeatable production migrations, automatic GitHub deploys, and production-ready validation/docs. Current readiness is incomplete: `start` runs TypeScript source directly and no production build output/script exists.

## Proposal Question Round

Assumptions needing user review: no custom domain in this slice; Render public URL is acceptable; production validation may use Bruno with non-secret test credentials/tokens entered locally.

## Scope

### In Scope
- Add explicit Render Blueprint config (`render.yaml`) for Web Service + managed PostgreSQL.
- Define production build/start/migration commands and required env vars without committing secrets.
- Adapt Bruno collection with a Production environment and `baseUrl` variables for deployed validation.
- Update GitHub repo docs: `.gitignore`, README production URL, Render checklist, and AI usage declaration preservation.

### Out of Scope
- Custom domains, paid-plan tuning, observability dashboards, or CI/CD beyond Render auto-deploy.
- New API features or database model changes beyond existing migrations.

## Capabilities

### New Capabilities
- `production-deployment`: Render deployment, managed PostgreSQL, env vars, build/start commands, and production migration execution.
- `production-validation-docs`: Bruno production validation plus README/.gitignore deployment documentation requirements.

### Modified Capabilities
- None; no existing `openspec/specs/` capabilities are present.

## Approach

Use Render Blueprint as the source of deployment intent. The Web Service will install dependencies, run Prisma generate, compile TypeScript to a real `dist` output, run `prisma migrate deploy` through Render `preDeployCommand` when supported, and start compiled Node output. Because the current project has no `build` script or tsdown config, design/apply must verify the actual compiler path before finalizing the start command. If Blueprint pre-deploy migrations are unavailable for the selected service type, document a safe Render Shell/one-off fallback.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `render.yaml` | New | Blueprint for API service and Render Postgres. |
| `package.json`, `tsconfig.json` | Modified | Production build/start/migration scripts. |
| `prisma/migrations/` | Used | Deployed with `prisma migrate deploy`. |
| `bruno/` | Modified | Production environment and variableized base URL. |
| `README.md`, `.gitignore` | Modified | Production URL, deployment checklist, ignored local/secrets files. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Wrong compiled entry path | Med | Verify build output before setting Render start command. |
| Migration failure during deploy | Med | Use `migrate deploy`; document manual fallback and rollback. |
| Secret leakage | Low | Keep secrets in Render env vars/local Bruno env only. |

## Rollback Plan

Revert the deployment commit, disable/revert Render Blueprint changes, restore previous scripts/docs, and point traffic back to no public API until migrations/env vars are corrected. Database rollback is manual unless migrations are non-destructive.

## Dependencies

- Render account, GitHub repo connection, Render Postgres, Cloudflare R2 credentials, JWT secret.

## Success Criteria

- [ ] Render public URL responds successfully to `/health`.
- [ ] Render service auto-deploys from GitHub and uses managed PostgreSQL.
- [ ] Production migrations run safely before/with deploy.
- [ ] Bruno Production environment validates the deployed API.
- [ ] README and `.gitignore` reflect production deployment and secret hygiene.
