# Cashi API

API REST para gestión de finanzas personales (categorías, transacciones y balance), construida con arquitectura **N-Layer**.

## Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Hono
- **DB**: PostgreSQL
- **ORM**: Prisma
- **Validación**: Zod
- **Testing**: Vitest
- **Contenedores**: Docker Compose

## Arquitectura (N-Layer)

La estructura sigue el flujo:

`routes -> controllers -> repositories -> database`

- `src/routes`: define endpoints HTTP y mapea handlers.
- `src/controllers`: parsea request, valida input, coordina casos de uso HTTP y arma response.
- `src/repositories`: única capa que accede a Prisma/DB y expone interfaces TypeScript explícitas como contratos (`CategoriesRepository`, `TransactionsRepository`).
- `src/schemas`: contratos Zod para validación.
- `src/lib`: utilidades transversales (Prisma singleton, mapeo de errores).

Decisión clave: el cálculo de balance (`totalIncome`, `totalExpense`, `balance`) vive en `transactions.controller.ts`.

## Requisitos

- Node.js 20+
- Corepack habilitado
- Docker + Docker Compose

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

- `DATABASE_URL`
- `PORT`

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

En Windows, si `yarn prisma:generate` falla con `EPERM` al renombrar
`query_engine-windows.dll.node`, frená primero cualquier proceso Node/tsx que esté
corriendo la API. Prisma no puede reemplazar ese DLL mientras la app lo tiene
cargado.

Crear/aplicar migración en desarrollo:

```bash
yarn prisma:migrate:dev
```

Aplicar migraciones en entorno desplegado:

```bash
yarn prisma:migrate:deploy
```

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

Verificación combinada para CI local (sin build):

```bash
yarn verify:ci
```

## Endpoints

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/` | Estado base de la API |
| GET | `/health` | Health check |
| GET | `/categories` | Listar categorías |
| GET | `/categories/:id` | Obtener categoría por id |
| POST | `/categories` | Crear categoría |
| PATCH | `/categories/:id` | Actualizar categoría |
| DELETE | `/categories/:id` | Eliminar categoría |
| GET | `/transactions` | Listar transacciones |
| GET | `/transactions/:id` | Obtener transacción por id |
| POST | `/transactions` | Crear transacción |
| PATCH | `/transactions/:id` | Actualizar transacción |
| DELETE | `/transactions/:id` | Eliminar transacción |
| GET | `/transactions/balance` | Obtener balance global |

## Validaciones y errores

- Errores de validación Zod retornan `400` con formato:

```json
{
  "error": "Validation error.",
  "errors": []
}
```

- Mapeo de errores de persistencia:
  - `P2002` -> `409` (`Resource already exists.`)
  - `P2003` -> `422` (`Referenced resource does not exist.`)
  - `P2025` -> `404` (`Resource not found.`)
  - inesperados -> `500` (`Internal server error.`)

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

El login de Cashi Mobile sigue siendo demo local. Esta API no implementa autenticación; expone categorías, transacciones y balance.

Si la base está recién migrada, `/categories` y `/transactions` pueden devolver `[]`; la app permite crear los datos desde cero.

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
  "categoryId": 1
}
```

Balance (`GET /transactions/balance`):

```json
{
  "totalIncome": 120,
  "totalExpense": 60,
  "balance": 60
}
```

## Cliente Bruno

La colección Bruno está en `bruno/` e incluye:

- Health
- Categories CRUD
- Transactions CRUD
- Balance

## Declaración de uso de IA

Durante el desarrollo se usaron asistentes de IA como herramienta de apoyo para acelerar tareas de implementación/documentación. Todas las decisiones técnicas y validación final fueron revisadas manualmente.
