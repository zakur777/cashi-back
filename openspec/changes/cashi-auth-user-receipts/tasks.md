# Tasks: cashi-auth-user-receipts

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900–1400 líneas |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 Zod 4 + Prisma base → PR 2 Auth pública → PR 3 Middleware/protección → PR 4 Transacciones por usuario → PR 5 Upload R2 → PR 6 README/cierre |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

## Notas de ejecución

- TDD estricto (`openspec/config.yaml`): cada slice empieza con pruebas RED y termina con `yarn test` verde.
- No tocar `.atl/skill-registry.md` ni editar `.gitignore` sin necesidad directa.
- Mantener arquitectura N-Layer: `routes -> controllers -> repositories -> schemas`; auth como middleware centralizado.
- Si un slice se acerca a 400 líneas, dividir en commits más pequeños que conserven pruebas verdes.

## Slice 1 — Zod 4 + modelo Prisma base

**Objetivo:** migrar validación base y preparar la base de datos para usuarios, ownership y metadata.

- [x] RED: agregar/ajustar pruebas de schemas en `tests/transactions/transactions.http.test.ts` para validar `receiptUrl`, `latitude`, `longitude` inválidos y opcionales; actualizar assertions de errores para ser estables en Zod 4.
- [x] RED: agregar prueba de contrato Prisma/tipos en `tests/repositories/repository-contracts.types.test.ts` que falle hasta que `Transaction` incluya `userId`, `receiptUrl`, `latitude`, `longitude`.
- [x] GREEN: actualizar `package.json` y lockfile: `zod@^4`, agregar dependencias previstas para siguientes slices (`bcryptjs`, `jsonwebtoken`, `@aws-sdk/client-s3`, `@types/jsonwebtoken` si aplica).
- [x] GREEN: migrar `src/schemas/categories.schema.ts` y `src/schemas/transactions.schema.ts` a patrones Zod 4 (`z.url()`, `{ error: ... }`, `.min(1)`), agregando metadata opcional a transacciones.
- [x] GREEN: actualizar `prisma/schema.prisma` con modelo `User`, relación `Transaction.userId`, `receiptUrl`, `latitude`, `longitude` e índices; crear migración Prisma en `prisma/migrations/**`.
- [x] REFACTOR: revisar que no queden APIs Zod 3 obsoletas con búsqueda en `src/**/*.ts` y `tests/**/*.ts`.
- [x] Verificar: `yarn prisma:generate`, `yarn typecheck`, `yarn test`.
- [ ] Rollback: revertir cambios de dependencias, schemas y migración; si se aplicó localmente, usar rollback Prisma o `yarn prisma migrate reset` en desarrollo.

## Slice 2 — Auth pública: register/login

**Objetivo:** exponer `/auth/register` y `/auth/login` sin protegerlos todavía.

- [x] RED: crear `tests/auth/auth.http.test.ts` con casos de register válido, email duplicado, payload inválido, login válido, login inválido y ausencia de `password`/`passwordHash` en responses.
- [x] RED: agregar tests de helper JWT en `tests/auth/auth-token.test.ts` para token válido, secreto faltante/controlado y payload inválido sin uso de `any`.
- [x] GREEN: crear `src/schemas/auth.schema.ts` con `registerSchema`/`loginSchema` Zod 4, normalizando email a lowercase.
- [x] GREEN: crear `src/repositories/users.repository.ts` con `findByEmail`, `findById` si se usará en middleware, y `create`.
- [x] GREEN: crear `src/lib/auth-token.ts` o `src/lib/jwt.ts` con `signAuthToken(userId)` y `verifyAuthToken(token)` usando `JWT_SECRET`.
- [x] GREEN: crear `src/controllers/auth.controller.ts` con bcrypt, errores `400`/`401`/`409`, y respuesta con `{ token }` y usuario público si se decide incluirlo.
- [x] GREEN: crear `src/routes/auth.routes.ts` y registrar `app.route('/auth', authRoutes)` en `src/index.ts` antes de rutas protegidas.
- [x] TRIANGULATE: agregar caso de email con mayúsculas para confirmar normalización y unicidad predecible.
- [x] REFACTOR: extraer constantes como `BCRYPT_SALT_ROUNDS` con patrón `as const` si corresponde.
- [x] Verificar: `yarn typecheck`, `yarn test`.
- [ ] Rollback: revertir archivos `auth.*`, `users.repository`, token helper y dependencias auth si este slice queda aislado.

## Slice 3 — Middleware centralizado y categorías protegidas

**Objetivo:** proteger rutas no-auth y tipar el contexto autenticado.

- [x] RED: actualizar `tests/app/app.bootstrap.test.ts` para confirmar que `/`, `/health`, `POST /auth/register` y `POST /auth/login` siguen públicos, pero `/categories` y `/transactions` rechazan sin token con `401`.
- [x] RED: actualizar `tests/categories/categories.http.test.ts` para enviar `Authorization: Bearer <token>` en casos existentes y agregar token inválido/malformado.
- [x] RED: agregar prueba de que dos usuarios autenticados ven la misma colección global de categorías, sin filtro por usuario.
- [x] GREEN: crear `src/types/app-env.ts` con `AuthUserContext` y `AppEnv` para `c.set('authUser', ...)` / `c.get('authUser')`.
- [x] GREEN: crear `src/middlewares/auth.middleware.ts` que valide header `Bearer`, verifique JWT y responda `401` en ausencia, formato inválido, expirado o payload inválido.
- [x] GREEN: ajustar `src/index.ts` para registrar `authRoutes` primero y aplicar `authMiddleware` a `/categories/*` y `/transactions/*` antes de `app.route`.
- [x] TRIANGULATE: agregar test de token válido que confirme que un handler protegido recibe `authUser.userId`.
- [x] REFACTOR: mantener controllers de categorías sin lógica de ownership ni JWT.
- [x] Verificar: `yarn typecheck`, `yarn test`.
- [ ] Rollback: retirar middleware/typing y restaurar registro público de rutas.

## Slice 4 — Transacciones por usuario y ownership

**Objetivo:** aislar CRUD/balance por usuario y distinguir `404` vs `403`.

- [x] RED: actualizar `tests/transactions/transactions.http.test.ts` para usar token válido en todos los casos existentes.
- [x] RED: agregar casos `GET /transactions` y `GET /transactions/balance` que excluyen transacciones de otro usuario.
- [x] RED: agregar casos `GET /transactions/:id`, `PATCH /transactions/:id`, `DELETE /transactions/:id` para own `200`, missing `404`, foreign `403`.
- [x] RED: agregar caso `POST /transactions` con `userId` ajeno en body y esperar que repository reciba el `userId` del token.
- [x] RED: agregar casos create/update con `receiptUrl`, `latitude`, `longitude` válidos e inválidos.
- [x] GREEN: cambiar `src/repositories/transactions.repository.ts` a `findAllByUserId`, `findAllForBalanceByUserId`, `create(...userId)`, `findById` con `userId` incluido; no decidir permisos en repository.
- [x] GREEN: actualizar `src/controllers/transactions.controller.ts` para leer `c.get('authUser').userId`, filtrar list/balance, asignar owner en create y hacer ownership check antes de get/update/delete.
- [x] GREEN: asegurar que `createTransactionSchema` no acepte `userId` como fuente de ownership y que `receiptUrl`/coordenadas se serialicen correctamente.
- [x] TRIANGULATE: confirmar que un id inexistente no se confunde con recurso ajeno: `404` para null y `403` solo si existe con otro `userId`.
- [x] REFACTOR: extraer helper local de autorización/serialización en controller si reduce duplicación sin mover permisos al repository.
- [x] Verificar: `yarn typecheck`, `yarn test`.
- [ ] Rollback: revertir repository/controller/schema de transacciones y pruebas asociadas; la migración base se revierte solo si se abandona todo el cambio.

## Slice 5 — Upload protegido a Cloudflare R2

**Objetivo:** subir comprobantes a R2 sin usar R2 real en tests.

- [x] RED: crear `tests/transactions/receipt-upload.http.test.ts` con sin token `401`, sin `receipt` `400`, MIME no permitido `400`, archivo >5 MB `400`, éxito con JPEG/PNG/WebP y error controlado de configuración/R2.
- [x] RED: mockear `src/lib/r2.ts` con Vitest y verificar que validaciones inválidas no llamen al uploader.
- [x] GREEN: crear `src/lib/r2.ts` con configuración de `@aws-sdk/client-s3`, validación de `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, y `uploadReceiptToR2` mockeable.
- [x] GREEN: agregar constantes de upload con `as const`: MIME permitidos JPEG/PNG/WebP, extensiones y `MAX_RECEIPT_BYTES = 5 * 1024 * 1024`.
- [x] GREEN: agregar handler `uploadReceipt` en `src/controllers/transactions.controller.ts` o `src/controllers/receipts.controller.ts` que use `await c.req.parseBody()`, field `receipt`, `File.size`, `arrayBuffer()` y key `receipts/{userId}/{randomUUID()}.{ext}`.
- [x] GREEN: registrar `POST /transactions/upload` en `src/routes/transactions.routes.ts` antes de `/:id`.
- [x] TRIANGULATE: agregar caso que confirme que `receiptUrl` retornado se puede enviar luego en `POST /transactions` y queda persistido.
- [x] REFACTOR: aislar construcción de public URL para probar slash final en `R2_PUBLIC_URL` sin exponer secretos.
- [x] Verificar: `yarn typecheck`, `yarn test`.
- [ ] Rollback: retirar route/handler/lib R2 y dependencia SDK si se revierte el slice completo.

## Slice 6 — README, demo y cierre

**Objetivo:** documentar configuración, flujo demostrable y decisiones de arquitectura/IA.

- [x] RED: actualizar o agregar pruebas/checks de documentación en `scripts/verify-docs.mjs` y/o tests existentes para exigir `JWT_SECRET`, variables `R2_*`, Cloudflare R2, flujo demo y disclosure de IA.
- [x] GREEN: actualizar `README.md` con stack actualizado, setup local/Docker si aplica, migración/reset de desarrollo, y variables `DATABASE_URL`, `PORT`, `JWT_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`.
- [x] GREEN: documentar configuración Cloudflare R2: bucket, credenciales S3 API, URL pública y cómo se forma `receiptUrl`.
- [x] GREEN: agregar checklist de video-demostración: register → login → copiar token → upload multipart `receipt` → crear transacción con `receiptUrl` → consultar balance autenticado.
- [x] GREEN: documentar arquitectura N-Layer, ubicación de `src/middlewares/auth.middleware.ts`, ownership checks en controllers y categorías globales protegidas.
- [x] GREEN: agregar declaración de uso de IA en `README.md`.
- [x] REFACTOR: revisar que comandos y ejemplos no incluyan secretos reales ni dependan de R2 en tests.
- [x] Verificar: `yarn verify:docs`, `yarn typecheck`, `yarn test`, y si está estable `yarn verify:ci`.
- [ ] Rollback: revertir README/checks de docs del slice.

## Cierre y evidencia final

- [ ] Ejecutar `yarn test` y guardar resultado en notas de entrega.
- [ ] Ejecutar `yarn typecheck` y `yarn verify:docs`; usar `yarn verify:ci` si todos los scripts están alineados.
- [ ] Revisar `git diff --stat` por slice para confirmar presupuesto de 400 líneas; si un PR supera el límite, separar cadena antes de revisión.
- [ ] Confirmar que no se modificó `.atl/skill-registry.md` ni `.gitignore` por accidente.
- [ ] Preparar resumen de PR con alcance, pruebas, riesgos de migración Prisma y rollback.
