# Propuesta: cashi-auth-user-receipts

## Intento

Agregar autenticación real, aislamiento de transacciones por usuario y subida de comprobantes a Cloudflare R2 para cumplir la Unidad 3 de Cashi. El cambio transforma la API actual de datos compartidos en una API multiusuario protegida, manteniendo la arquitectura N-Layer (`routes -> controllers -> repositories -> schemas`) y migrando las validaciones a Zod 4.

## Contexto

- Requerimiento base: `requerimientos/requerimiento-3.md` y apoyo técnico en `requerimientos/unidad-3.md`.
- Stack actual: TypeScript + Hono + Prisma + PostgreSQL + Zod 3 + Vitest.
- `openspec/config.yaml` activa `strict_tdd: true`; la implementación posterior debe escribir/ajustar pruebas antes del código productivo.
- Test runner: `yarn test`.
- Decisiones del usuario:
  - Almacenamiento de comprobantes: Cloudflare R2, no uploads locales.
  - Zod: migrar a Zod 4 como parte de este requisito.
  - Entrega: dividir en fases/commits si el cambio supera 400 líneas modificadas.
- Forecast de tamaño: 700–1100 líneas modificadas; se propone entrega en slices para respetar el presupuesto de revisión.

## Alcance

- Crear modelo `User` con email único, `passwordHash` y `createdAt`.
- Extender `Transaction` con `receiptUrl`, `latitude`, `longitude` y `userId`.
- Implementar `POST /auth/register` y `POST /auth/login` con bcrypt y JWT.
- Proteger todas las rutas excepto `/auth/register` y `/auth/login` mediante middleware centralizado.
- Mantener categorías globales, pero accesibles solo para usuarios autenticados.
- Convertir transacciones a datos por usuario:
  - `GET /transactions` filtra por usuario autenticado.
  - `GET /transactions/balance` calcula solo con datos del usuario autenticado.
  - `POST /transactions` toma `userId` desde el token, no desde el body.
  - `PATCH`/`DELETE /transactions/:id` devuelven `404` si no existe y `403` si pertenece a otro usuario.
- Agregar `POST /transactions/upload` protegido, con multipart field `receipt`, validación de JPEG/PNG/WebP y límite de 5 MB.
- Subir comprobantes a Cloudflare R2 y devolver `{ "receiptUrl": "https://..." }`.
- Migrar schemas existentes a patrones de Zod 4.
- Actualizar README con variables de entorno, configuración R2, flujo de prueba, arquitectura y declaración de uso de IA.

## Áreas afectadas

### Base de datos y Prisma

- `prisma/schema.prisma`
  - Nuevo modelo `User`.
  - Relación `User -> Transaction`.
  - Campos opcionales `receiptUrl`, `latitude`, `longitude` en `Transaction`.
  - Índices esperados para `userId` y relaciones relevantes.
- Nueva migración Prisma para usuario, relación y campos de comprobante/GPS.

### Dependencias y configuración

- `package.json` / lockfile
  - Agregar `bcryptjs`, `jsonwebtoken`, `@aws-sdk/client-s3`.
  - Agregar tipos necesarios para bcrypt/JWT si aplica.
  - Migrar `zod` a versión 4.
- Variables de entorno esperadas:
  - `JWT_SECRET`
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`
  - `R2_PUBLIC_URL`

### Código fuente

- `src/index.ts` o app bootstrap
  - Registrar rutas públicas de auth antes de middleware protegido.
  - Aplicar middleware a categorías y transacciones.
- `src/routes/auth.routes.ts`
- `src/controllers/auth.controller.ts`
- `src/repositories/users.repository.ts`
- `src/schemas/auth.schema.ts`
- `src/middlewares/auth.middleware.ts`
- `src/lib/r2.ts` y/o `src/lib/upload.ts`
- `src/controllers/transactions.controller.ts`
- `src/repositories/transactions.repository.ts`
- `src/schemas/transactions.schema.ts`
- `src/routes/transactions.routes.ts`
- Tests existentes y nuevos para auth, protección, ownership, filtro por usuario, balance y upload.

### Documentación

- `README.md`
  - Setup local y Docker Compose.
  - Variables de entorno.
  - Configuración de Cloudflare R2.
  - Flujo: register → login → upload receipt → create transaction → balance.
  - Arquitectura: middleware separado y ownership check en controller.
  - Declaración de uso de IA.

## Fuera de alcance / non-goals

- No implementar almacenamiento local como alternativa; R2 es la decisión de producto para este cambio.
- No hacer que categorías sean por usuario; siguen siendo globales.
- No aceptar `userId` desde el body de transacciones.
- No agregar refresh tokens, recuperación de contraseña, roles, revocación de tokens ni rate limiting.
- No desplegar a Render en este cambio, salvo documentación si ya existe sección de despliegue.
- No tocar `.atl/skill-registry.md` ni cambios no relacionados de `.gitignore`.

## Enfoque propuesto

1. Migrar dependencias y schemas a Zod 4 usando validadores top-level (`z.email()`, `z.url()`) y parámetros `{ error: ... }` donde corresponda.
2. Agregar modelo `User` y relación obligatoria de `Transaction.userId`. En desarrollo se acepta reset/migración limpia si hay datos de prueba.
3. Implementar auth N-Layer:
   - schemas para register/login;
   - repository de users;
   - controller con bcrypt y JWT;
   - routes `/auth/register` y `/auth/login`.
4. Implementar `authMiddleware` centralizado que valide `Authorization: Bearer {token}` y setee `userId` en el contexto Hono.
5. Proteger rutas existentes registrando middleware antes de rutas protegidas.
6. Ajustar transacciones para usar `userId` autenticado y ownership check en controller.
7. Implementar cliente R2 y upload protegido con validaciones de tipo/tamaño y respuesta `receiptUrl`.
8. Actualizar README y ejemplos de uso.

## Plan de pruebas y validación

Por `strict_tdd`, cada slice de implementación debe iniciar con pruebas fallidas y terminar en verde.

- Auth:
  - Register crea usuario con password hasheada y devuelve token.
  - Login con credenciales válidas devuelve token.
  - Login/register inválidos devuelven errores esperados.
  - Email duplicado devuelve error controlado.
- Middleware/protección:
  - Rutas protegidas sin token o con token inválido devuelven `401`.
  - `/auth/register` y `/auth/login` permanecen públicas.
  - Categorías requieren auth pero siguen siendo globales.
- Transacciones por usuario:
  - Lista y balance filtran por `userId` autenticado.
  - Create ignora/no acepta `userId` del body y usa token.
  - Update/delete propios funcionan.
  - Update/delete inexistente devuelve `404`.
  - Update/delete de otro usuario devuelve `403`.
- Upload R2:
  - Request sin `receipt` devuelve `400`.
  - MIME no permitido devuelve error.
  - Archivo sobre 5 MB devuelve error.
  - Archivo válido llama a R2 y devuelve `receiptUrl` pública.
- Zod 4:
  - Schemas compilan y tests existentes no dependen de APIs Zod 3 obsoletas.
- Validación final mínima:
  - `yarn test`
  - `yarn typecheck` si sigue disponible durante la implementación.

## Propuesta de slices de entrega

| Slice | Objetivo | Contenido | Validación |
| --- | --- | --- | --- |
| 1 | Base auth + Zod 4 | Migrar Zod, dependencias bcrypt/JWT, modelo `User`, schemas/repository/controller/routes auth | Tests auth + `yarn test` |
| 2 | Protección y datos por usuario | Middleware, protección de categorías/transacciones, `Transaction.userId`, filtros, balance y ownership | Tests 401/403/404/filtros/balance + `yarn test` |
| 3 | Comprobantes R2 + metadata | Campos `receiptUrl`/GPS, cliente R2, `POST /transactions/upload`, validaciones multipart | Tests upload + transacciones con receipt/GPS + `yarn test` |
| 4 | README y cierre | Documentar env vars, R2, flujo completo, arquitectura, IA y comandos | Revisión docs + `yarn test` si hubo ajustes de código |

Si un slice se acerca o supera las 400 líneas modificadas, dividirlo en commits más pequeños manteniendo pruebas verdes por commit.

## Riesgos

- Migración destructiva: agregar `userId` obligatorio a transacciones existentes puede requerir reset de BD de desarrollo o migración en etapas si se preservan datos.
- Orden de middleware en Hono: si se registra después de `app.route`, las rutas pueden quedar accidentalmente públicas.
- Tipos de JWT: el payload debe validarse/castearse con cuidado para no introducir `any` ni `userId` inválido.
- Zod 4 puede romper schemas/tests que usen APIs de Zod 3 como `.email()` encadenado, `.url()` encadenado o `required_error`.
- Multipart/R2 puede ser difícil de testear sin mocks; se debe aislar el cliente R2 detrás de una función testeable.
- R2 requiere bucket público y variables completas; errores de configuración pueden pasar en local si no se prueban explícitamente.
- El tamaño del cambio excede el presupuesto de revisión; requiere slices y commits descriptivos.

## Rollback

- Revertir commits/slices en orden inverso.
- Si ya se aplicó migración local, ejecutar rollback de migración Prisma o `yarn prisma migrate reset` en entorno de desarrollo.
- Remover variables `JWT_SECRET` y `R2_*` agregadas al entorno si se revierte por completo.
- Reinstalar dependencia previa de Zod si el rollback vuelve al estado anterior.
- Confirmar rollback con `yarn test`.

## Criterios de éxito

- `/auth/register` y `/auth/login` funcionan y devuelven JWT.
- Las contraseñas nunca se guardan en texto plano; se usa bcrypt.
- Todas las rutas no-auth rechazan requests sin token o con token inválido con `401`.
- Categorías siguen globales, pero protegidas.
- Transacciones y balance solo muestran datos del usuario autenticado.
- Crear transacción asocia `userId` desde token.
- Update/delete respetan `404` para inexistente y `403` para recurso de otro usuario.
- `POST /transactions/upload` sube a Cloudflare R2, valida JPEG/PNG/WebP y máximo 5 MB, y devuelve `receiptUrl`.
- `receiptUrl`, `latitude` y `longitude` pueden guardarse/actualizarse en transacciones.
- Zod 4 queda instalado y los schemas usan patrones compatibles.
- README documenta env vars, R2, flujo completo, arquitectura y uso de IA.
- La implementación se entrega en slices/commits revisables si supera 400 líneas modificadas.
- `yarn test` pasa al cierre de cada slice y al final del cambio.
