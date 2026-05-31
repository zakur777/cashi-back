# Diseño técnico: autenticación, usuarios y comprobantes R2

Este cambio convierte Cashi en una API multiusuario: agrega registro/login con JWT, protege categorías y transacciones, aísla transacciones por dueño y sube comprobantes a Cloudflare R2. La implementación debe mantener la arquitectura N-Layer actual y seguir TDD estricto.

## Resumen ejecutivo

| Área | Decisión |
| --- | --- |
| Autenticación | `POST /auth/register` y `POST /auth/login` públicos; bcrypt para hash; JWT con `userId` como sujeto. |
| Protección | Middleware Hono centralizado aplicado a `/categories` y `/transactions`; solo `/`, `/health`, `/auth/*` quedan públicos. |
| Datos por usuario | `Transaction.userId` obligatorio; list/balance filtran por usuario; create toma `userId` del token. |
| Ownership | Controllers leen la transacción por id, retornan `404` si no existe y `403` si existe pero no pertenece al usuario. Repositories no deciden permisos. |
| Comprobantes | `POST /transactions/upload` protegido; multipart field `receipt`; valida JPEG/PNG/WebP y 5 MB; sube a Cloudflare R2; devuelve URL pública. |
| Validación | Migrar a Zod 4 en todos los schemas antes o junto con los nuevos contratos. |
| Entrega | Dividir en slices revisables; forecast supera 400 líneas, por lo que debe implementarse en commits/fases. |

## Arquitectura actual y restricciones

### Estado actual

- Stack: TypeScript ESM, Hono, Prisma, PostgreSQL, Zod 3, Vitest.
- Flujo N-Layer existente: `routes -> controllers -> repositories -> database`, con schemas Zod en `src/schemas` y utilidades en `src/lib`.
- `src/index.ts` registra rutas públicas sin middleware: `/`, `/health`, `/categories`, `/transactions`.
- `Transaction` no tiene dueño ni metadata de comprobante/GPS.
- `transactionsRepository.findAll()` y `findAllForBalance()` devuelven datos globales.
- Tests HTTP mockean repositories y validan controllers/routes; no hay auth ni contexto de usuario.

### Restricciones de diseño

- No implementar código en esta fase; solo escribir este diseño.
- Mantener N-Layer; controllers no deben usar Prisma directo.
- Middleware de auth separado, no inline por ruta.
- Ownership check en controller, no en repository.
- Categorías siguen siendo globales, pero requieren autenticación.
- No aceptar `userId` del body como fuente de ownership.
- R2 es el único backend de upload para este cambio.
- `openspec/config.yaml` tiene `strict_tdd: true`: cada slice inicia con pruebas RED.
- Presupuesto de revisión: 400 líneas; usar slices si el cambio lo supera.

## Modelo de datos y migración Prisma

### Schema objetivo

```prisma
model User {
  id           Int           @id @default(autoincrement())
  email        String        @unique
  passwordHash String
  createdAt    DateTime      @default(now())
  transactions Transaction[]
}

model Transaction {
  id          Int      @id @default(autoincrement())
  amount      Decimal  @db.Decimal(12, 2)
  type        String
  description String?
  date        DateTime
  receiptUrl  String?
  latitude    Float?
  longitude   Float?
  categoryId  Int
  category    Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  userId      Int
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([categoryId])
  @@index([userId])
}
```

### Plan de migración

1. Agregar modelo `User`.
2. Agregar `receiptUrl String?`, `latitude Float?`, `longitude Float?` a `Transaction`.
3. Agregar relación `Transaction.userId` obligatoria.
4. En desarrollo se acepta `yarn prisma migrate reset` si existen transacciones antiguas sin dueño.
5. Si se necesitara preservar datos, usar migración en etapas: `userId Int?` → backfill → `userId Int` obligatorio.
6. Regenerar cliente Prisma después de migrar.

### Consideraciones

- `User.email` debe normalizarse a lowercase antes de persistir para que el contrato de unicidad sea predecible.
- `passwordHash` nunca se expone en responses.
- `onDelete: Cascade` para `User -> Transaction` simplifica limpieza de pruebas/desarrollo; no afecta categorías globales.

## Dependencias y variables de entorno

### Dependencias runtime

- `bcryptjs`: hash y compare de passwords.
- `jsonwebtoken`: firma/verificación JWT.
- `@aws-sdk/client-s3`: cliente compatible con Cloudflare R2.
- `zod@^4`: migración de validación.

### Dependencias de tipos

- `@types/jsonwebtoken` si `jsonwebtoken` no trae tipos suficientes.
- `@types/bcryptjs` solo si la versión instalada lo requiere; preferir no agregar si `bcryptjs` ya exporta tipos.

### Variables nuevas

| Variable | Uso |
| --- | --- |
| `JWT_SECRET` | Secreto obligatorio para firmar/verificar tokens. |
| `R2_ACCOUNT_ID` | Construye endpoint S3-compatible: `https://<account>.r2.cloudflarestorage.com`. |
| `R2_ACCESS_KEY_ID` | Credencial R2. |
| `R2_SECRET_ACCESS_KEY` | Secreto R2. |
| `R2_BUCKET_NAME` | Bucket destino. |
| `R2_PUBLIC_URL` | Base pública para construir `receiptUrl`. |

### Validación de configuración

- Auth debe fallar de forma controlada si `JWT_SECRET` falta al firmar/verificar.
- Upload debe validar configuración R2 antes de subir y responder error controlado si está incompleta.
- README debe documentar variables y ejemplo `.env`.

## Diseño de autenticación

### Archivos nuevos previstos

- `src/schemas/auth.schema.ts`
- `src/repositories/users.repository.ts`
- `src/controllers/auth.controller.ts`
- `src/routes/auth.routes.ts`
- `src/lib/jwt.ts` o `src/lib/auth-token.ts`

### Schemas Zod 4

- `registerSchema` y `loginSchema`:
  - `email`: `z.email({ error: 'Invalid email.' }).transform((email) => email.toLowerCase())`.
  - `password`: `z.string().min(8, { error: 'Password must be at least 8 characters.' })`.
- Mantener tipos con `z.infer`.
- No usar APIs Zod 3 deprecadas como `z.string().email()` ni `required_error`.

### Repository

`UsersRepository` expone solo operaciones de datos:

- `findByEmail(email: string)`
- `findById(id: number)` si el middleware necesita validar existencia del usuario.
- `create(data: { email: string; passwordHash: string })`

No hashea passwords, no firma JWT y no decide respuestas HTTP.

### Controller

#### Register

1. Parsear body con `registerSchema`.
2. Buscar email existente o capturar error único Prisma.
3. Si existe: responder error controlado, recomendado `409 Conflict` con `{ error: 'Email already registered.' }`.
4. Hashear password con bcrypt (`hash(password, 10)` o constante `BCRYPT_SALT_ROUNDS = 10`).
5. Crear usuario con `email` y `passwordHash`.
6. Firmar JWT.
7. Responder `201` con `{ token }` y opcionalmente `{ user: { id, email } }`; nunca incluir password ni hash.

#### Login

1. Parsear body con `loginSchema`.
2. Buscar usuario por email normalizado.
3. Si no existe o `bcrypt.compare` falla: `401 Unauthorized` con mensaje genérico, por ejemplo `{ error: 'Invalid credentials.' }`.
4. Firmar JWT.
5. Responder `200` con `{ token }` y opcionalmente usuario público.

### Token helper

- Payload recomendado: `{ sub: String(user.id), userId: user.id }` para compatibilidad y claridad.
- Expiración recomendada: `1d` o `7d`; documentar si se fija.
- `signAuthToken(userId: number): string`.
- `verifyAuthToken(token: string): { userId: number }`.
- Verificación debe validar que `userId`/`sub` sea numérico; si no, retornar error de auth sin `any`.

## Middleware Hono y tipado de contexto

### Archivo y contrato

Crear `src/middlewares/auth.middleware.ts` con función central:

```ts
export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => { ... }
```

Definir tipo compartido, por ejemplo en `src/types/app-env.ts`:

```ts
export interface AuthUserContext {
  userId: number;
}

export type AppEnv = {
  Variables: {
    authUser: AuthUserContext;
  };
};
```

Controllers que requieran auth usan `Context<AppEnv>` y leen `c.get('authUser').userId`.

### Comportamiento

- Leer `Authorization`.
- Requerir formato exacto `Bearer <token>`.
- Verificar JWT con helper.
- Setear `authUser` en contexto.
- Responder `401` para header ausente, malformado, token inválido o expirado.

### Registro de rutas

Orden recomendado en `src/index.ts`:

1. `app.get('/')` y `indexRoutes` (`/health`) públicos.
2. `app.route('/auth', authRoutes)` público.
3. Aplicar middleware a rutas protegidas:
   - opción A: `app.use('/categories/*', authMiddleware)` y `app.use('/transactions/*', authMiddleware)` antes de `app.route(...)`.
   - opción B: routers protegidos internos con `categoriesRoutes.use('*', authMiddleware)` y `transactionsRoutes.use('*', authMiddleware)`.
4. `app.route('/categories', categoriesRoutes)` y `app.route('/transactions', transactionsRoutes)`.

Rutas públicas finales: `/`, `/health`, `POST /auth/register`, `POST /auth/login`.

## Protección de categorías

- No cambiar repositorio ni modelo de `Category` para user ownership.
- Aplicar auth middleware a todas las rutas `/categories`.
- Controllers actuales pueden mantenerse sin leer `userId`, porque categorías son globales.
- Tests deben actualizarse para enviar token válido o montar el router con contexto autenticado.
- Agregar tests de `401` para access sin token y de visibilidad compartida entre usuarios.

## Diseño de transacciones por usuario

### Repository

Modificar contrato para que filtre por `userId` donde corresponde, sin hacer ownership decisions:

- `findAllByUserId(userId: number)`
- `findById(id: number)` para controller ownership check.
- `create(data: CreateTransactionInput & { userId: number })`
- `update(id: number, data: UpdateTransactionInput)`
- `remove(id: number)`
- `findAllForBalanceByUserId(userId: number)`

`findById` debe incluir `userId` en el payload para que el controller compare dueño. También incluir `category` como hoy.

### Controller flow

- `listTransactions`: obtiene `userId` del contexto y llama `findAllByUserId(userId)`.
- `getTransactionById`:
  1. `findById(id)`.
  2. Si `null`: `404`.
  3. Si `transaction.userId !== authUser.userId`: `403`.
  4. Si dueño: devolver detalle.
- `createTransaction`:
  1. Parsear body.
  2. Ignorar o rechazar `userId` del body. Para cumplir “no usar body userId”, schema puede `.strip()` por defecto y controller siempre agrega `userId` desde token.
  3. Llamar `create({ ...payload, userId })`.
- `updateTransaction`:
  1. Parsear body.
  2. `findById(id)` para ownership.
  3. `404` si no existe; `403` si otro dueño.
  4. `update(id, payload)` si dueño.
- `deleteTransaction`:
  1. `findById(id)`.
  2. `404` si no existe; `403` si otro dueño.
  3. `remove(id)` si dueño.
- `getTransactionsBalance`: `findAllForBalanceByUserId(userId)`.

### Serialización

- Mantener `amount` como `number` en response.
- `date` como ISO string.
- Incluir `receiptUrl`, `latitude`, `longitude` y posiblemente `userId` si ya se devuelve todo el objeto; preferible ocultar `userId` salvo que los tests actuales dependan del shape completo. Definirlo en tests antes de implementar.

### Semántica 403 vs 404

- Para id inexistente: `404 Not Found`.
- Para id existente de otro usuario: `403 Forbidden`.
- Esto requiere buscar por id global antes de modificar/eliminar; no basta con `where: { id, userId }`, porque eso no distingue inexistente vs ajeno.

## Diseño de upload a Cloudflare R2

### Archivos previstos

- `src/lib/r2.ts`: configuración y función `uploadReceiptToR2`.
- `src/lib/receipt-upload.ts` o helpers en controller para validación de `File`.
- Endpoint en `src/routes/transactions.routes.ts`: `transactionsRoutes.post('/upload', uploadReceipt)` antes de `/:id`.
- Handler en `src/controllers/transactions.controller.ts` o controller separado `receipts.controller.ts` si se mantiene el route bajo transactions. Para menor cambio, `uploadReceipt` en transactions controller es aceptable.

### Parsing multipart

- Usar `await c.req.parseBody()` de Hono.
- Leer `body.receipt`.
- Validar que sea `File`; si falta o no es archivo: `400`.
- Leer tamaño desde `file.size` antes de cargar bytes.
- Convertir a `Buffer`/`Uint8Array` con `await file.arrayBuffer()` solo después de validar tamaño.

### Validación

Constantes con patrón `as const`:

- `ALLOWED_RECEIPT_MIME_TYPES = { JPEG: 'image/jpeg', PNG: 'image/png', WEBP: 'image/webp' } as const`.
- `MAX_RECEIPT_BYTES = 5 * 1024 * 1024`.
- Mapeo extensión: `image/jpeg -> jpg`, `image/png -> png`, `image/webp -> webp`.

Errores:

- Sin `receipt`: `400`.
- MIME no permitido: `400`.
- Tamaño > 5 MB: `400`.
- Config R2 incompleta o error del SDK: error controlado; recomendado `500` con `{ error: 'Receipt upload failed.' }` sin filtrar secretos.

### Key generation y URL pública

- Key: `receipts/{userId}/{crypto.randomUUID()}.{ext}` para evitar colisiones y facilitar trazabilidad.
- `PutObjectCommand` con:
  - `Bucket: R2_BUCKET_NAME`
  - `Key: key`
  - `Body: Uint8Array | Buffer`
  - `ContentType: file.type`
- URL: `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`.
- Respuesta: `201` o `200` con `{ receiptUrl }`; elegir una y fijarla en tests. Recomendado `201` porque crea un objeto.

### Test strategy sin R2 real

- No hacer requests a Cloudflare en tests.
- Aislar función `uploadReceiptToR2(input, client?)` o inyectar un uploader mockeable.
- Tests unitarios/HTTP deben mockear el módulo `src/lib/r2.ts` con Vitest.
- Verificar que archivo válido llama uploader con `key`, `contentType`, `body` y devuelve `receiptUrl`.
- Verificar que invalid MIME/oversize/no field no llaman uploader.
- Verificar config incompleta simulando error controlado del uploader.

## Migración a Zod 4

### Cambios de patrón

- Reemplazar `z.string().email()` por `z.email()`.
- Reemplazar `z.string().url()` por `z.url()`.
- Reemplazar `.nonempty()` por `.min(1)`.
- Usar `{ error: '...' }` para mensajes nuevos en vez de APIs antiguas.
- Mantener `z.coerce.number()` y `z.coerce.date()` si siguen compatibles.

### Schemas existentes

- `categories.schema.ts`:
  - `name`: `z.string().trim().min(1, { error: 'Name is required.' })`.
  - `type` y `color` pueden seguir con `z.enum`.
  - `partial().refine(...)` se mantiene si compila en Zod 4; ajustar mensaje a `{ error }` solo si aplica.
- `transactions.schema.ts`:
  - Agregar `receiptUrl: z.url({ error: 'Invalid receipt URL.' }).optional()`.
  - `latitude`: número entre `-90` y `90` opcional.
  - `longitude`: número entre `-180` y `180` opcional.
  - No incluir `userId` en schema persistible; si se desea tolerar body con `userId`, schema debe strippear campos desconocidos y controller agrega el dueño.

### Tests

- Ajustar expectativas de `ZodError.issues` solo si cambian mensajes/códigos.
- Priorizar assertions estables: `status 400`, `error: 'Validation error.'`, `Array.isArray(errors)` y paths esperados.

## Plan TDD estricto

Cada slice debe dejar evidencia de ciclo:

1. **RED**: agregar/actualizar tests que fallen por funcionalidad ausente.
2. **GREEN**: implementar mínimo para pasar.
3. **TRIANGULATE**: agregar caso que fuerce comportamiento no trivial (duplicado, token inválido, otro usuario, oversize, etc.).
4. **REFACTOR**: limpiar duplicación manteniendo verde.

Evidencia esperada en commits/PR:

- Mensaje o descripción que identifique RED/GREEN/TRIANGULATE/REFACTOR.
- `yarn test` al cierre de cada slice.
- `yarn typecheck` si se modifican tipos globales, Prisma payloads o middleware context.

## Delivery slices / plan de commits

Como el forecast supera 400 líneas, implementar en fases revisables. Si un slice excede 400 líneas cambiadas, dividirlo en sub-commits manteniendo tests verdes.

| Slice | Objetivo | Cambios | Validación |
| --- | --- | --- | --- |
| 1 | Zod 4 + base Prisma User | Dependencia Zod 4, schemas existentes migrados, modelo `User`, campos metadata y `userId` en Prisma. | Tests existentes actualizados, `yarn test`, `yarn typecheck`. |
| 2 | Auth pública | `auth.schema`, `users.repository`, token helper, controller/routes register/login, bcrypt/JWT, duplicate email. | Tests register/login/invalid/duplicate/no password in response. |
| 3 | Middleware y protección | `auth.middleware`, `AppEnv` typing, registro de rutas protegidas, categorías protegidas. | Tests 401 sin/invalid token, auth routes públicas, categorías globales autenticadas. |
| 4 | Transacciones por usuario | Repositories con `userId`, controller ownership, list/balance filtrados, create con owner del token, 403/404. | Tests aislamiento, create ignora userId body, update/delete/get 403 vs 404. |
| 5 | Upload R2 | Cliente R2, multipart, validación MIME/tamaño, key y URL, route `/transactions/upload`. | Tests upload sin R2 real, validaciones, success URL. |
| 6 | README/docs y cierre | Env vars, R2 setup, flujo demo, arquitectura, IA, comandos. | Revisión docs, `yarn test`; `yarn verify:docs` si aplica. |

## Plan de pruebas

### Auth

- Register válido crea usuario con `passwordHash` distinto al plaintext y devuelve token.
- Register email duplicado devuelve `409` y no crea segundo usuario.
- Register/login payload inválido devuelve `400` validation.
- Login válido compara bcrypt y devuelve token.
- Login email desconocido/password incorrecto devuelve `401` genérico.
- Respuestas no contienen `password` ni `passwordHash`.

### Middleware/protección

- Sin header `Authorization`: `401`.
- Header malformado, token inválido o expirado: `401`.
- Token válido setea `authUser.userId` para handlers.
- `/auth/register` y `/auth/login` no requieren token.
- `/categories` y `/transactions` sí requieren token.

### Categorías

- Usuario autenticado puede listar/crear/actualizar/eliminar categorías globales.
- Dos usuarios ven la misma colección, sin filtro por owner.

### Transacciones

- `GET /transactions` excluye transacciones de otros usuarios.
- `GET /transactions/balance` calcula solo datos del usuario.
- `GET /transactions/:id`: own `200`, missing `404`, foreign `403`.
- `POST /transactions`: asigna `userId` del token; body `userId` no controla dueño.
- `PATCH` y `DELETE`: own ok, missing `404`, foreign `403`.
- Metadata `receiptUrl`, `latitude`, `longitude` se valida y persiste cuando está presente.

### Upload

- Sin token: `401`.
- Sin `receipt`: `400`.
- MIME no permitido: `400`, no llama uploader.
- Archivo > 5 MB: `400`, no llama uploader.
- Archivo válido: llama uploader mockeado y responde `{ receiptUrl }`.
- Config R2 incompleta/error SDK: respuesta controlada sin leak de secretos.

### Validación final

```bash
yarn test
yarn typecheck
```

Usar `yarn verify:ci` si el slice de docs toca checks existentes.

## Plan README/docs

Actualizar `README.md` en el slice final con:

- Stack actualizado: Zod 4, JWT/bcrypt, Cloudflare R2.
- Variables: `DATABASE_URL`, `PORT`, `JWT_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`.
- Setup R2: crear bucket, credenciales S3 API, configurar URL pública, permisos públicos/Custom Domain si corresponde.
- Flujo demostrable:
  1. Register.
  2. Login.
  3. Copiar token.
  4. Upload receipt multipart.
  5. Crear transacción con `receiptUrl`.
  6. Consultar balance.
- Arquitectura: ubicación del middleware central y ownership check en controllers.
- Endpoints actualizados con columna Auth.
- Declaración de uso de IA.
- Nota de migración/reset para desarrollo si existen transacciones sin `userId`.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Migración destructiva por `userId` obligatorio | Falla migrate con datos antiguos | Documentar `migrate reset` para desarrollo; si se preservan datos, migración nullable/backfill/required. |
| Middleware registrado en orden incorrecto | Rutas protegidas quedan públicas | Tests de 401 para categorías/transacciones y revisión explícita del orden en `src/index.ts`. |
| JWT payload no tipado | `userId` inválido o uso de `any` | Helper con parse/guards sobre `unknown`; tipos `AppEnv`. |
| Zod 4 rompe mensajes/tests | Falsos fallos de validación | Migrar schemas en slice propio y assertar contratos estables. |
| R2 difícil de probar | Tests lentos/flaky o credenciales reales | Aislar uploader y mockear SDK; nunca usar R2 real en tests. |
| Leaks de secretos/config | Seguridad y evaluación | Errores genéricos para SDK/config; README sin valores reales. |
| Cambio muy grande | Revisión supera 400 líneas | Slices 1–6, commits pequeños y tests verdes por commit. |
| Body `userId` usado accidentalmente | Vulnerabilidad de ownership | Schema no incluye `userId`; tests envían `userId` ajeno y esperan dueño del token. |

## Rollout y rollback

### Rollout

1. Instalar dependencias y migrar Zod 4.
2. Aplicar migración Prisma y regenerar cliente.
3. Implementar auth pública.
4. Activar middleware en rutas no-auth.
5. Migrar transacciones a user ownership.
6. Agregar upload R2.
7. Documentar y validar flujo completo.

### Rollback

- Revertir commits/slices en orden inverso.
- Si la migración se aplicó en desarrollo, usar rollback Prisma o `yarn prisma migrate reset`.
- Remover variables `JWT_SECRET` y `R2_*` del entorno si se revierte por completo.
- Confirmar con `yarn test`.
