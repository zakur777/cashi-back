# Apply Progress: cashi-auth-user-receipts

## Workload / PR boundary

- Delivery mode: approved sliced apply.
- Applied in this pass: **Slice 1 only — Zod 4 + Prisma base**.
- Not applied: auth routes/controllers, auth middleware, ownership behavior in controllers, R2 upload handler.
- Review forecast from tasks remains high for the full change; keep following the planned chain/slices.

## Completed tasks

- [x] Added RED transaction HTTP tests for optional `receiptUrl`, `latitude`, `longitude` and invalid metadata with stable error-path assertions.
- [x] Added RED repository/type contract coverage requiring Prisma `Transaction` to expose `userId`, `receiptUrl`, `latitude`, `longitude`.
- [x] Updated dependencies and lockfile for Zod 4 and planned auth/R2 dependencies.
- [x] Migrated category/transaction schemas to Zod 4-compatible error options and top-level `z.url()`.
- [x] Added optional transaction metadata to create/update transaction schemas.
- [x] Updated Prisma schema with `User`, `Transaction.userId`, receipt/GPS metadata, and indexes.
- [x] Created Prisma migration `20260531023843_add_users_and_transaction_metadata`.
- [x] Regenerated Prisma client.
- [x] Searched for stale Zod 3 schema patterns in `src` and `tests`.

## Files changed

- `package.json`
- `yarn.lock`
- `prisma/schema.prisma`
- `prisma/migrations/migration_lock.toml`
- `prisma/migrations/20260531023843_add_users_and_transaction_metadata/migration.sql`
- `src/schemas/categories.schema.ts`
- `src/schemas/transactions.schema.ts`
- `src/repositories/transactions.repository.ts`
- `tests/repositories/repository-contracts.types.test.ts`
- `tests/transactions/transactions.http.test.ts`
- `openspec/changes/cashi-auth-user-receipts/tasks.md`
- `openspec/changes/cashi-auth-user-receipts/apply-progress.md`

## TDD Cycle Evidence

| Cycle | Phase | Evidence |
| --- | --- | --- |
| 1 | RED | `yarn test tests/transactions/transactions.http.test.ts` failed: metadata was stripped and invalid metadata returned `500` instead of `400`. |
| 1 | RED | `yarn typecheck` failed: Prisma `Transaction` type did not include `userId`, `receiptUrl`, `latitude`, `longitude`. |
| 1 | GREEN | Updated Zod schemas, Prisma schema/migration, dependencies, and Prisma client. Focused transaction test passed: 15/15. |
| 1 | TRIANGULATE | Full suite exposed Zod 4 default behavior on `createCategorySchema.partial()` adding `type: 'expense'` during PATCH. |
| 1 | REFACTOR | Split category create/update schemas so create keeps defaults and update does not apply defaults to omitted fields. |
| 1 | VERIFY | Final `yarn prisma:generate`, `yarn typecheck`, and `yarn test` passed. |

## Test commands run

- `yarn test tests/transactions/transactions.http.test.ts --runInBand` — failed because Vitest does not support `--runInBand`; reran without that flag.
- `yarn test tests/transactions/transactions.http.test.ts` — RED failed, then passed after implementation.
- `yarn typecheck` — RED failed before Prisma schema update/generate, then passed.
- `yarn prisma migrate dev --name add_users_and_transaction_metadata --create-only` — created migration but warned existing 5 transactions block applying required `userId` without reset/backfill.
- `yarn prisma:generate` — passed.
- `yarn test` — first full run found category PATCH regression; final run passed: 4 files, 31 tests.

## Deviations from design

- Added a temporary repository input bridge: `transactionsRepository.create` accepts `userId?: number` and throws `Authenticated user id is required.` if missing. This keeps TypeScript compatible with the required Prisma `userId` before later auth/ownership slices wire the real authenticated user id. Slice 4 should replace this with required authenticated ownership flow.
- Prisma migration is create-only and not applied to the current development database because existing transactions without `userId` block applying a required column.

## Remaining tasks

- Slice 2: Auth pública register/login.
- Slice 3: Middleware centralizado + categorías protegidas.
- Slice 4: Transacciones por usuario + ownership; remove the temporary optional `userId` bridge.
- Slice 5: Upload protegido a Cloudflare R2.
- Slice 6: README/demo/cierre.

## Risks / notes

- Current DB has 5 existing `Transaction` rows; applying the migration as-is will fail unless the DB is reset in development or a backfill/nullable migration strategy is approved.
- `.atl/skill-registry.md` remains modified from prior work and was not touched.
- `.gitignore` was not edited.

---

## Slice 2 update — Auth pública register/login

## Workload / PR boundary

- Applied in this pass: **Slice 2 only — public auth register/login**.
- Not applied: route-protection middleware, category protection, transaction ownership, or R2 upload.
- Review forecast remains high for the full SDD change; continue following the approved slice chain.

## Completed tasks

- [x] Added RED auth HTTP tests for register success, duplicate email, invalid payload, login success, invalid login, and response exclusion of `password`/`passwordHash`.
- [x] Added RED JWT helper tests for valid token, missing `JWT_SECRET`, and invalid payload without `any`.
- [x] Added Zod 4 auth schemas with lowercase email normalization.
- [x] Added `usersRepository` contract and implementation.
- [x] Added `auth-token` helper with `signAuthToken(userId)` and `verifyAuthToken(token)`.
- [x] Added auth controller with bcrypt hashing/compare, `400`/`401`/`409` responses, token response, and public user serialization.
- [x] Added auth routes and registered `/auth` in `src/index.ts`.
- [x] Triangulated uppercase email normalization through register/login tests.
- [x] Extracted `BCRYPT_SALT_ROUNDS` and token expiry constants.

## Files changed

- `src/index.ts`
- `src/controllers/auth.controller.ts`
- `src/lib/auth-token.ts`
- `src/repositories/users.repository.ts`
- `src/routes/auth.routes.ts`
- `src/schemas/auth.schema.ts`
- `tests/auth/auth.http.test.ts`
- `tests/auth/auth-token.test.ts`
- `openspec/changes/cashi-auth-user-receipts/tasks.md`
- `openspec/changes/cashi-auth-user-receipts/apply-progress.md`

## TDD Cycle Evidence

| Cycle | Phase | Evidence |
| --- | --- | --- |
| 2 | RED | `yarn test tests/auth/auth.http.test.ts tests/auth/auth-token.test.ts` failed: `/auth/register` and `/auth/login` returned `404`; `src/lib/auth-token.js` did not exist. |
| 2 | GREEN | Added auth schemas, repository, token helper, controller, routes, and `/auth` route registration. Focused auth tests passed: 2 files, 8 tests. |
| 2 | TRIANGULATE | Register/login tests use `ADA@EXAMPLE.COM` and assert repository receives `ada@example.com`, confirming lowercase normalization. |
| 2 | REFACTOR | Kept public user serialization in a helper and extracted `BCRYPT_SALT_ROUNDS = 10 as const`; token expiry is centralized in `AUTH_TOKEN_EXPIRES_IN`. |
| 2 | VERIFY | `yarn typecheck` passed and full `yarn test` passed: 6 files, 39 tests. |

## Test commands run

- `yarn test tests/auth/auth.http.test.ts tests/auth/auth-token.test.ts` — RED failed before implementation, then passed after implementation: 2 files, 8 tests.
- `yarn typecheck` — passed.
- `yarn test` — passed: 6 files, 39 tests.

## Deviations from design

- Auth responses include `{ token, user: { id, email } }`; this follows the design's optional public user response and avoids exposing password fields.
- `verifyAuthToken` accepts numeric `userId` or numeric `sub`; invalid payloads throw `Invalid auth token payload.` for later middleware to map to `401`.

## Remaining tasks

- Slice 3: Middleware centralizado + categorías protegidas.
- Slice 4: Transacciones por usuario + ownership; remove the temporary optional `userId` bridge.
- Slice 5: Upload protegido a Cloudflare R2.
- Slice 6: README/demo/cierre.

## Risks / notes

- `JWT_SECRET` is required at runtime for register/login token issuance; README/env documentation remains for Slice 6.
- Auth routes are public, but no route-protection middleware was added in this slice by design.
- `.atl/skill-registry.md` remains modified from prior work and was not touched.
- `.gitignore` was not edited.

---

## Slice 3 update — Middleware centralizado y rutas protegidas

## Workload / PR boundary

- Applied in this pass: **Slice 3 only — centralized auth middleware + protected categories/transactions**.
- Not applied: transaction ownership/user filtering, R2 upload, or README final documentation.
- Review forecast remains high for the full SDD change; continue following the approved slice chain.

## Completed tasks

- [x] Updated app bootstrap tests to confirm `/`, `/health`, `/auth/register`, and `/auth/login` remain public while `/categories` and `/transactions` reject missing tokens with `401`.
- [x] Updated category route tests so existing happy/error cases send `Authorization: Bearer <token>`.
- [x] Added category tests for missing, malformed, and invalid tokens returning `401` before repository access.
- [x] Added category global-sharing test proving different authenticated users see the same category collection.
- [x] Updated existing transaction route tests to send valid auth for protected routes without adding ownership behavior yet.
- [x] Added typed auth context in `src/types/app-env.ts`.
- [x] Added centralized `authMiddleware` in `src/middlewares/auth.middleware.ts`.
- [x] Typed the Hono app with `AppEnv` and protected `/categories`, `/categories/*`, `/transactions`, and `/transactions/*` after public routes.
- [x] Added triangulation test proving middleware sets `authUser.userId` for downstream handlers.

## Files changed

- `src/index.ts`
- `src/middlewares/auth.middleware.ts`
- `src/types/app-env.ts`
- `tests/app/app.bootstrap.test.ts`
- `tests/categories/categories.http.test.ts`
- `tests/transactions/transactions.http.test.ts`
- `openspec/changes/cashi-auth-user-receipts/tasks.md`
- `openspec/changes/cashi-auth-user-receipts/apply-progress.md`

## TDD Cycle Evidence

| Cycle | Phase | Evidence |
| --- | --- | --- |
| 3 | RED | `yarn test tests/app/app.bootstrap.test.ts tests/categories/categories.http.test.ts tests/transactions/transactions.http.test.ts` failed: `/categories` and `/transactions` still returned `200` without auth instead of `401`. |
| 3 | GREEN | Added `AppEnv`, centralized `authMiddleware`, and route protection registration in `src/index.ts`; focused route-protection tests passed: 3 files, 34 tests. |
| 3 | TRIANGULATE | Added a protected probe test with `Hono<AppEnv>` confirming a valid token makes `{ userId: 42 }` available through `c.get('authUser')`; focused tests passed: 3 files, 35 tests. |
| 3 | REFACTOR | Kept category controllers unchanged and free of JWT/ownership logic; centralized bearer parsing and auth failure response in middleware. |
| 3 | VERIFY | `yarn typecheck` passed and full `yarn test` passed: 6 files, 45 tests. |

## Test commands run

- `yarn test tests/app/app.bootstrap.test.ts tests/categories/categories.http.test.ts tests/transactions/transactions.http.test.ts` — RED failed before middleware, then passed after implementation and triangulation: 3 files, 35 tests.
- `yarn typecheck` — passed.
- `yarn test` — passed: 6 files, 45 tests.

## Deviations from design

- Protected both exact base paths and wildcard paths with `app.use('/categories', ...)`, `app.use('/categories/*', ...)`, `app.use('/transactions', ...)`, and `app.use('/transactions/*', ...)` so `/categories` and `/transactions` are protected as well as nested routes.
- Middleware verifies JWT and sets `authUser`, but does not validate user existence against the database in this slice.

## Remaining tasks

- Slice 4: Transacciones por usuario + ownership; remove the temporary optional `userId` bridge.
- Slice 5: Upload protegido a Cloudflare R2.
- Slice 6: README/demo/cierre.

## Risks / notes

- `JWT_SECRET` is now required for all protected category/transaction requests because middleware verifies JWTs.
- Transactions are protected but not yet filtered by authenticated user; that remains Slice 4.
- `.atl/skill-registry.md` remains modified from prior work and was not touched.
- `.gitignore` was not edited.

---

## Slice 4 update — Transacciones por usuario y ownership

## Workload / PR boundary

- Applied in this pass: **Slice 4 only — per-user transactions + ownership**.
- Not applied: R2 upload route/storage, README/docs final updates, or commit/push.
- Review forecast remains high for the full SDD change; continue following the approved slice chain.

## Completed tasks

- [x] Updated transaction route tests to assert authenticated-user filtering for list and balance.
- [x] Added ownership tests for detail/update/delete: own `200`, missing `404`, foreign `403`.
- [x] Added create test proving body `userId` is ignored and repository receives the authenticated token user id.
- [x] Kept create/update metadata tests for `receiptUrl`, `latitude`, `longitude` valid and invalid cases.
- [x] Updated `transactionsRepository` contract to `findAllByUserId`, `findAllForBalanceByUserId`, and `create(data, userId)`.
- [x] Updated transaction controller to read `c.get('authUser').userId`, filter list/balance, assign create ownership, and authorize detail/update/delete in the controller.
- [x] Removed the temporary optional `userId` bridge from the repository.
- [x] Typed `transactionsRoutes` as `Hono<AppEnv>`.

## Files changed

- `src/controllers/transactions.controller.ts`
- `src/repositories/transactions.repository.ts`
- `src/routes/transactions.routes.ts`
- `tests/transactions/transactions.http.test.ts`
- `openspec/changes/cashi-auth-user-receipts/tasks.md`
- `openspec/changes/cashi-auth-user-receipts/apply-progress.md`

## TDD Cycle Evidence

| Cycle | Phase | Evidence |
| --- | --- | --- |
| 4 | RED | `yarn test tests/transactions/transactions.http.test.ts` failed: controller still called global repository methods, create did not pass auth `userId`, and foreign resources returned `200`/`500` instead of `403`/`404`. |
| 4 | GREEN | Added user-filtered repository methods and controller ownership flow. Focused transaction tests passed: 1 file, 19 tests. |
| 4 | TRIANGULATE | Added/kept paired missing-vs-foreign cases for detail, update, and delete to prove `404` is only for absent ids and `403` is only for existing transactions owned by another user. |
| 4 | REFACTOR | Extracted `getAuthenticatedUserId`, `isTransactionOwner`, and `findOwnedTransaction` helpers in the controller while keeping permission decisions out of the repository. |
| 4 | VERIFY | `yarn typecheck` passed and full `yarn test` passed: 6 files, 49 tests. |

## Test commands run

- `yarn test tests/transactions/transactions.http.test.ts` — RED failed before implementation; passed after implementation: 1 file, 19 tests.
- `yarn typecheck` — passed.
- `yarn test` — passed: 6 files, 49 tests.

## Deviations from design

- Responses still include `userId` because the controller serializes the Prisma transaction payload. The design marked hiding `userId` as preferable, not mandatory, and existing Slice 4 tests use it to verify ownership assignment.
- `findById` remains a global lookup and includes `userId`; this is intentional so the controller can distinguish missing `404` from foreign `403`.

## Remaining tasks

- Slice 5: Upload protegido a Cloudflare R2.
- Slice 6: README/demo/cierre.

## Risks / notes

- R2 upload is still not implemented by design.
- `.atl/skill-registry.md` remains modified from prior work and was not touched.
- `.gitignore` was not edited.

---

## Slice 5 update — Upload protegido a Cloudflare R2

## Workload / PR boundary

- Applied in this pass: **Slice 5 only — protected Cloudflare R2 receipt upload with mocked tests**.
- Not applied: README/docs final updates, video checklist, commit/push, or unrelated features.
- Review forecast remains high for the full SDD change; continue following the approved slice chain.

## Completed tasks

- [x] Added RED receipt upload HTTP tests for missing token `401`, missing `receipt` `400`, unsupported MIME `400`, oversized file `400`, successful JPEG/PNG/WebP uploads, and controlled R2/config failure.
- [x] Mocked `src/lib/r2.ts` in upload tests and asserted invalid validation paths do not call the uploader.
- [x] Added `src/lib/r2.ts` with Cloudflare R2 S3-compatible client configuration, required `R2_*`/public URL validation, mockable `uploadReceiptToR2`, and public URL builder.
- [x] Added upload constants with `as const`: allowed JPEG/PNG/WebP MIME types, extension mapping, and `MAX_RECEIPT_BYTES = 5 * 1024 * 1024`.
- [x] Added `uploadReceipt` handler under transaction controller using `c.req.parseBody()`, `receipt` field, MIME/size validation, `arrayBuffer()`, authenticated `userId`, and `receipts/{userId}/{randomUUID()}.{ext}` keys.
- [x] Registered `POST /transactions/upload` before `/:id` in `transactions.routes.ts`.
- [x] Triangulated transaction integration by uploading a receipt URL and then using it in `POST /transactions`.
- [x] Refactored public URL construction into `buildR2PublicUrl`, including trailing-slash handling without exposing secrets.

## Files changed

- `src/controllers/transactions.controller.ts`
- `src/lib/r2.ts`
- `src/routes/transactions.routes.ts`
- `tests/transactions/receipt-upload.http.test.ts`
- `openspec/changes/cashi-auth-user-receipts/tasks.md`
- `openspec/changes/cashi-auth-user-receipts/apply-progress.md`

## TDD Cycle Evidence

| Cycle | Phase | Evidence |
| --- | --- | --- |
| 5 | RED | `yarn test tests/transactions/receipt-upload.http.test.ts` failed: authenticated `/transactions/upload` requests returned `404` because the upload route/handler did not exist. |
| 5 | GREEN | Added R2 lib, upload constants, controller handler, and route registration; focused upload tests passed after partial-mocking R2 so validation helpers used real code and `uploadReceiptToR2` stayed mocked. |
| 5 | TRIANGULATE | Added case proving returned `receiptUrl` can be passed into `POST /transactions` and repository receives/persists that URL. |
| 5 | REFACTOR | Extracted `buildR2PublicUrl(publicUrl, key)` and added a trailing-slash test for `R2_PUBLIC_URL` plus leading slash in key. |
| 5 | VERIFY | `yarn typecheck` passed and full `yarn test` passed: 7 files, 59 tests. |

## Test commands run

- `yarn test tests/transactions/receipt-upload.http.test.ts` — RED failed before implementation: 1/9 passed, 8 failed with `404`; passed after implementation and refactor: 10/10.
- `yarn typecheck` — passed.
- `yarn test` — passed: 7 files, 59 tests.

## Deviations from design

- Implemented `uploadReceipt` in `transactions.controller.ts` rather than a separate receipts controller to keep the endpoint under the existing transactions route with minimal slice scope.
- `src/lib/r2.ts` exports validation helpers/constants used by the controller; tests partially mock only `uploadReceiptToR2` so no Cloudflare request is made.

## Remaining tasks

- Slice 6: README, demo checklist, R2/env documentation, architecture notes, and final verification.

## Risks / notes

- Runtime upload now requires `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, and `R2_PUBLIC_URL`; missing config returns controlled `500` from the upload route.
- Tests do not call real Cloudflare R2.
- `.atl/skill-registry.md` remains modified from prior work and was not touched.
- `.gitignore` was not edited.

---

## Slice 6 update — README, demo y cierre documental

## Workload / PR boundary

- Applied in this pass: **Slice 6 only — README/docs, env vars, demo checklist, and closure notes**.
- Not applied: runtime feature changes beyond the docs verification script.
- Review forecast remains high for the full SDD change; this slice is documentation/check-only and should be reviewed with the previous feature slices as the closing work unit.

## Completed tasks

- [x] Updated `scripts/verify-docs.mjs` to require auth/R2 README sections, required env variables, Cloudflare R2, bearer auth, upload route, demo flow, architecture notes, and AI disclosure.
- [x] Updated `.env.example` with safe placeholders for `JWT_SECRET` and all `R2_*` variables.
- [x] Updated `README.md` with stack/dependencies, setup, migration/reset note, auth flow, endpoint auth matrix, Cloudflare R2 setup, receipt URL construction, demo checklist, N-Layer/auth middleware/ownership explanation, and AI usage disclosure.
- [x] Refactored docs for scanning with tables/checklists and avoided real secrets.

## Files changed

- `README.md`
- `.env.example`
- `scripts/verify-docs.mjs`
- `openspec/changes/cashi-auth-user-receipts/tasks.md`
- `openspec/changes/cashi-auth-user-receipts/apply-progress.md`

## TDD Cycle Evidence

| Cycle | Phase | Evidence |
| --- | --- | --- |
| 6 | RED | `yarn verify:docs` failed after expanding docs checks: README was missing `## Autenticación y autorización`, `## Cloudflare R2 para comprobantes`, and `## Checklist de video demostrativo`. |
| 6 | GREEN | Added the required README sections and `.env.example` variables; `yarn verify:docs` passed. |
| 6 | TRIANGULATE | Docs verification now also checks `.env.example` for `JWT_SECRET` and all R2 variables plus exact demo-flow and architecture terms in README. |
| 6 | REFACTOR | README uses tables/checklists, safe placeholder credentials, and notes tests mock R2 without real Cloudflare calls. |
| 6 | VERIFY | `yarn verify:docs`, `yarn typecheck`, `yarn test`, and `yarn verify:ci` passed. |

## Test commands run

- `yarn verify:docs` — RED failed before README/env updates; passed after docs updates.
- `yarn typecheck` — passed.
- `yarn test` — passed: 7 files, 59 tests.
- `yarn verify:ci` — passed.

## Deviations from design

- No runtime deviations. Slice 6 changed documentation and the documentation verification script only.

## Remaining tasks

- Final review/commit planning for the full `cashi-auth-user-receipts` change.
- Optionally run manual endpoint smoke tests with real `.env`/R2 credentials before recording the video.

## Risks / notes

- Real upload still requires valid Cloudflare R2 credentials and public URL in `.env`.
- README intentionally uses safe placeholders, not real secrets.
- `.atl/skill-registry.md` remains modified from prior work and was not touched.
- `.gitignore` was not edited.
