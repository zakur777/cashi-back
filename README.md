# Cashi API

API REST para gestión de finanzas personales con usuarios reales, transacciones privadas por usuario y comprobantes en **Cloudflare R2**. Mantiene arquitectura **N-Layer** para separar rutas, controllers, repositories, schemas y utilidades transversales.

## Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Hono
- **DB**: PostgreSQL
- **ORM**: Prisma
- **Validación**: Zod 4
- **Auth**: JWT + bcrypt
- **Storage**: Cloudflare R2 para comprobantes
- **Testing**: Vitest
- **Contenedores**: Docker Compose

## Arquitectura (N-Layer)

La estructura sigue el flujo:

`routes -> controllers -> repositories -> database`

- `src/routes`: define endpoints HTTP y mapea handlers.
- `src/controllers`: parsea request, valida input, coordina casos de uso HTTP y arma response.
- `src/repositories`: única capa que accede a Prisma/DB y expone interfaces TypeScript explícitas como contratos (`CategoriesRepository`, `TransactionsRepository`, `UsersRepository`).
- `src/schemas`: contratos Zod 4 para validación.
- `src/middlewares/auth.middleware.ts`: middleware centralizado que valida `Authorization: Bearer {token}` y deja `authUser.userId` en el contexto Hono.
- `src/lib`: utilidades transversales como Prisma singleton, JWT, R2 y mapeo de errores.

Decisiones clave:

- Las categorías son globales, pero requieren autenticación.
- Las transacciones pertenecen a un usuario y se filtran por `userId` del token.
- El cálculo de balance (`totalIncome`, `totalExpense`, `balance`) vive en `transactions.controller.ts` y usa solo transacciones del usuario autenticado.
- El **ownership check** de transacciones vive en el controller, no en el repository: si el registro no existe responde `404`; si existe pero pertenece a otro usuario responde `403`.

## Requisitos

- Node.js 20+
- Corepack habilitado
- Docker + Docker Compose
- Cuenta/bucket de Cloudflare R2 para subir comprobantes reales

## Setup (Yarn + Corepack)

```bash
corepack enable
yarn install
```

## Variables de entorno

Crear `.env` desde `.env.example`:

```bash
cp .env.example .env
```

Variables requeridas:

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión PostgreSQL usada por Prisma. |
| `PORT` | Puerto HTTP de la API, por defecto `3000`. |
| `JWT_SECRET` | Secreto para firmar/verificar tokens JWT. Usá un valor largo y aleatorio. |
| `R2_ACCOUNT_ID` | Account ID de Cloudflare para construir el endpoint S3-compatible. |
| `R2_ACCESS_KEY_ID` | Access key de R2. |
| `R2_SECRET_ACCESS_KEY` | Secret key de R2. |
| `R2_BUCKET_NAME` | Bucket donde se guardan comprobantes. |
| `R2_PUBLIC_URL` | URL pública base del bucket o dominio público; se combina con la key para formar `receiptUrl`. |

No subas valores reales de `JWT_SECRET` ni credenciales R2 al repositorio.

## Base de datos (Docker Compose)

Levantar PostgreSQL:

```bash
docker compose up -d
```

## Prisma

Generar cliente:

```bash
yarn prisma:generate
```

Crear/aplicar migración en desarrollo:

```bash
yarn prisma:migrate:dev
```

Aplicar migraciones en entorno desplegado:

```bash
yarn prisma:migrate:deploy
```

Si venís de datos de Unidad 2 con transacciones sin `userId`, en desarrollo podés reiniciar la base:

```bash
yarn prisma migrate reset
```

Esto borra datos locales, recrea tablas y aplica las migraciones. Es útil para cumplir el nuevo modelo con `User` y transacciones obligatoriamente asociadas a un usuario.

En Windows, si `yarn prisma:generate` falla con `EPERM` al renombrar `query_engine-windows.dll.node`, frená primero cualquier proceso Node/tsx que esté corriendo la API.

## Ejecutar API

Desarrollo:

```bash
yarn dev
```

Health check esperado:

```bash
curl http://localhost:3000/health
```

Respuesta:

```json
{"status":"ok"}
```

## Testing

Run tests:

```bash
yarn test
```

Validar tipos sin emitir build:

```bash
yarn typecheck
```

Modo watch:

```bash
yarn test:watch
```

Verificación rápida de bootstrap/runtime y onboarding docs:

```bash
yarn verify:bootstrap
yarn verify:docs
```

Verificación combinada para CI local:

```bash
yarn verify:ci
```

Los tests de upload mockean R2; no requieren credenciales reales ni llaman a Cloudflare.

## Autenticación y autorización

Flujo base:

1. `POST /auth/register` crea un usuario con email/password y devuelve un JWT.
2. `POST /auth/login` valida credenciales y devuelve un JWT.
3. Las demás rutas usan header `Authorization: Bearer {token}`.
4. El middleware centralizado en `src/middlewares/auth.middleware.ts` verifica el token y setea `authUser.userId`.

Las contraseñas se guardan como hash bcrypt. Las respuestas públicas nunca incluyen `password` ni `passwordHash`.

### Ejemplo register

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com","password":"password123"}'
```

Respuesta esperada:

```json
{
  "token": "jwt...",
  "user": { "id": 1, "email": "ada@example.com" }
}
```

### Ejemplo login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com","password":"password123"}'
```

## Cloudflare R2 para comprobantes

`POST /transactions/upload` recibe `multipart/form-data` con el campo `receipt`, sube el archivo a Cloudflare R2 y devuelve una URL pública:

```json
{ "receiptUrl": "https://pub-example.r2.dev/receipts/1/uuid.jpg" }
```

Validaciones:

- Campo requerido: `receipt`.
- MIME permitido: JPEG, PNG o WebP.
- Tamaño máximo: 5 MB.
- Ruta protegida: requiere `Authorization: Bearer {token}`.

Configuración R2 mínima:

1. Crear un bucket en Cloudflare R2, por ejemplo `cashi-receipts`.
2. Crear credenciales S3 API para el bucket.
3. Configurar en `.env`: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` y `R2_PUBLIC_URL`.
4. Habilitar una URL pública del bucket o un dominio público. Esa base se usa para construir `receiptUrl` junto con la key `receipts/{userId}/{uuid}.{ext}`.

Ejemplo de upload:

```bash
curl -X POST http://localhost:3000/transactions/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "receipt=@./boleta.jpg"
```

## Endpoints

| Método | Endpoint | Auth | Descripción |
|---|---|---:|---|
| GET | `/` | ❌ | Estado base de la API |
| GET | `/health` | ❌ | Health check |
| POST | `/auth/register` | ❌ | Crear cuenta y devolver token |
| POST | `/auth/login` | ❌ | Iniciar sesión y devolver token |
| GET | `/categories` | ✅ | Listar categorías globales |
| GET | `/categories/:id` | ✅ | Obtener categoría por id |
| POST | `/categories` | ✅ | Crear categoría global |
| PATCH | `/categories/:id` | ✅ | Actualizar categoría global |
| DELETE | `/categories/:id` | ✅ | Eliminar categoría global |
| GET | `/transactions` | ✅ | Listar transacciones del usuario autenticado |
| GET | `/transactions/balance` | ✅ | Obtener balance del usuario autenticado |
| GET | `/transactions/:id` | ✅ | Obtener transacción propia; `403` si es ajena |
| POST | `/transactions` | ✅ | Crear transacción asociada al usuario autenticado |
| PATCH | `/transactions/:id` | ✅ | Actualizar transacción propia; `403` si es ajena |
| DELETE | `/transactions/:id` | ✅ | Eliminar transacción propia; `403` si es ajena |
| POST | `/transactions/upload` | ✅ | Subir comprobante a R2 y devolver `receiptUrl` |

## Validaciones y errores

- Errores de validación Zod retornan `400` con formato:

```json
{
  "error": "Validation error.",
  "errors": []
}
```

- Auth:
  - Token faltante, malformado, inválido o expirado -> `401`.
  - Login inválido -> `401`.
  - Email ya registrado -> `409`.
- Ownership de transacciones:
  - Transacción inexistente -> `404`.
  - Transacción existente de otro usuario -> `403`.
- Mapeo de errores de persistencia:
  - `P2002` -> `409` (`Resource already exists.`)
  - `P2003` -> `422` (`Referenced resource does not exist.`)
  - `P2025` -> `404` (`Resource not found.`)
  - inesperados -> `500` (`Internal server error.`)

## Ejemplos rápidos de payload

Crear categoría (`POST /categories`):

```json
{
  "name": "Food",
  "type": "expense",
  "color": "#EDF7BD"
}
```

Colores de categoría aceptados por el contrato mobile/backend:

```txt
#281C59 #4E8D9C #85C79A #EDF7BD
#FF8A7A #FFD166 #7DD3FC #A7F3D0
#C9C4FF #F9A8D4 #FDBA74 #60A5FA
```

Crear transacción (`POST /transactions`):

```json
{
  "amount": 99.99,
  "type": "expense",
  "description": "Dinner",
  "date": "2026-01-12T00:00:00.000Z",
  "categoryId": 1,
  "receiptUrl": "https://pub-example.r2.dev/receipts/1/uuid.jpg",
  "latitude": -33.4489,
  "longitude": -70.6693
}
```

`userId` no se envía en el body. El controller toma el dueño desde el token JWT.

Balance (`GET /transactions/balance`):

```json
{
  "totalIncome": 120,
  "totalExpense": 60,
  "balance": 60
}
```

## Checklist de video demostrativo

Flujo mínimo para demostrar el requerimiento 3:

- [ ] Levantar Docker/PostgreSQL y la API.
- [ ] Ejecutar register → login → copiar token → upload multipart `receipt` → crear transacción con `receiptUrl` → consultar balance.
- [ ] Mostrar que `/categories` o `/transactions` sin token responde `401`.
- [ ] Crear dos usuarios y demostrar que `GET /transactions`/balance muestra solo datos del usuario autenticado.
- [ ] Intentar editar o eliminar una transacción ajena y mostrar `403`.
- [ ] Consultar un id inexistente y mostrar `404`.
- [ ] Explicar dónde vive el middleware: `src/middlewares/auth.middleware.ts`.
- [ ] Explicar por qué el ownership check está en `src/controllers/transactions.controller.ts` y no en el repository.
- [ ] Mostrar que el upload usa Cloudflare R2 y que `receiptUrl` se usa al crear/editar una transacción.

## Integración con Cashi Mobile

Para probar desde Expo Go en emulador Android, dejá la API escuchando en el puerto `3000` y en el repo mobile usá:

```txt
EXPO_PUBLIC_CASHI_DATA_SOURCE=backend
EXPO_PUBLIC_CASHI_API_BASE_URL=http://127.0.0.1:3000
```

En el emulador hay que reenviar el puerto del host:

```bash
adb reverse tcp:3000 tcp:3000
```

La app móvil debe enviar el token JWT en `Authorization: Bearer {token}` para categorías, transacciones y upload.

## Cliente Bruno

La colección Bruno está en `bruno/` e incluye:

- Health
- Auth: register, login y segundo usuario para demo de ownership
- Categories CRUD
- Transactions CRUD
- Upload multipart de comprobante (`POST /transactions/upload`) con fixture en `bruno/fixtures/cashi-receipt-test.png`
- Balance
- Casos de seguridad: transacción ajena `403` y transacción inexistente `404`

Usar el environment `Local`, donde `baseUrl` apunta a `http://localhost:3000`.

Orden recomendado para grabar el video:

1. `Health / 1-Get Health`
2. `auth / 2-Register`
3. `auth / 3-Login`
4. `categories / 4-Create Category`
5. `categories / 5-List Categories`
6. `transactions / 6-Upload Receipt`
7. `transactions / 7-Create Transaction`
8. `transactions / 8-List Transactions`
9. `transactions / 9-Get Balance`
10. `auth / Register Second User`
11. `transactions / Get Foreign Transaction 403`
12. `transactions / Get Missing Transaction 404`

Las requests de auth guardan `authToken`/`userBToken` como variables de Bruno, y las requests de creación guardan `categoryId`, `receiptUrl` y `transactionId` para encadenar el flujo. Si Bruno no toma automáticamente el archivo del upload, seleccionar manualmente `bruno/fixtures/cashi-receipt-test.png` en el campo multipart `receipt`.

## Declaración de uso de IA

Durante el desarrollo se usaron asistentes de IA como herramienta de apoyo para analizar requerimientos, planificar el SDD, implementar código, escribir tests y actualizar documentación. Todas las decisiones técnicas y validación final fueron revisadas manualmente.
