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
- `src/repositories`: única capa que accede a Prisma/DB.
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

## Testing

Run tests:

```bash
yarn test
```

Modo watch:

```bash
yarn test:watch
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

## Ejemplos rápidos de payload

Crear categoría (`POST /categories`):

```json
{
  "name": "Food"
}
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
