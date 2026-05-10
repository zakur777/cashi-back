# PRD — Cashi API de Finanzas Personales

Cashi será una API REST para registrar ingresos y egresos personales, organizarlos por categoría y consultar el balance general. El proyecto se implementará con arquitectura N-Layer usando el stack trabajado en la Unidad 2: TypeScript, Hono, Prisma, PostgreSQL, Docker Compose y Zod.

## Objetivo

Construir el backend de Cashi como un microservicio claro, mantenible y evaluable, donde cada capa tenga una responsabilidad definida y los datos financieros se guarden correctamente en PostgreSQL.

## Alcance del producto

### Incluye

- CRUD completo de categorías.
- CRUD completo de transacciones.
- Relación entre transacciones y categorías.
- Cálculo de balance general.
- Validación de entradas con Zod.
- Persistencia en PostgreSQL mediante Prisma.
- Base de datos levantada con Docker Compose.
- README con instrucciones de instalación, ejecución y uso.

### No incluye

- Autenticación de usuarios.
- Frontend o aplicación móvil.
- Múltiples cuentas por usuario.
- Reportes avanzados por fecha, mes o categoría.
- Monedas múltiples.

## Usuarios objetivo

El consumidor principal de esta API será el equipo frontend de Cashi, que necesita endpoints estables para registrar movimientos financieros y mostrar el balance actualizado.

## Stack técnico

| Tecnología | Uso en el proyecto |
| --- | --- |
| Node.js | Runtime instalado localmente en el equipo de desarrollo. No se fijará Node 22 como requisito rígido. |
| TypeScript | Tipado estático y mayor seguridad al desarrollar. |
| Hono | Framework HTTP liviano para definir rutas y manejar requests. |
| Prisma | ORM para interactuar con PostgreSQL desde TypeScript. |
| PostgreSQL | Base de datos relacional principal. |
| Docker Compose | Levantar PostgreSQL sin instalarlo directamente en la máquina. |
| Zod | Validación de datos de entrada y generación de tipos. |

## Arquitectura requerida

El proyecto usará arquitectura N-Layer. La separación de responsabilidades es obligatoria porque forma parte central de la evaluación.

```txt
src/
├── routes/
│   ├── categories.routes.ts
│   └── transactions.routes.ts
├── controllers/
│   ├── categories.controller.ts
│   └── transactions.controller.ts
├── repositories/
│   ├── categories.repository.ts
│   └── transactions.repository.ts
├── schemas/
│   ├── categories.schema.ts
│   └── transactions.schema.ts
├── lib/
│   ├── prisma.ts
│   └── prisma-errors.ts
└── index.ts
```

### Responsabilidades por capa

| Capa | Responsabilidad | No debe hacer |
| --- | --- | --- |
| Routes | Registrar endpoints y conectar rutas con controllers. | Validar datos, calcular balance o acceder a Prisma. |
| Controllers | Leer request, validar con Zod, llamar repositories y responder HTTP. | Importar Prisma directamente. |
| Repositories | Ejecutar operaciones de base de datos con Prisma. | Manejar HTTP o decidir status codes. |
| Schemas | Definir contratos de entrada con Zod. | Contener lógica de negocio. |
| Lib | Utilidades compartidas como Prisma Client y helpers de errores. | Contener lógica específica de endpoints. |

> Decisión arquitectónica: no se agregará capa `services/` porque el alcance es pequeño y la Unidad 2 evalúa explícitamente routes → controller → repository, más schemas.

## Modelo de datos

### Category

| Campo | Tipo | Reglas |
| --- | --- | --- |
| id | number | Autogenerado. |
| name | string | Requerido, no vacío. |

### Transaction

| Campo | Tipo | Reglas |
| --- | --- | --- |
| id | number | Autogenerado. |
| amount | number | Requerido, positivo. Nunca negativo. |
| type | string | Requerido. Valores permitidos: `income`, `expense`. |
| description | string | Opcional. |
| date | Date | Requerido. Ingresado por el usuario. |
| categoryId | number | Requerido. Debe referenciar una categoría existente. |

### Relación

Una categoría puede tener muchas transacciones. Una transacción pertenece a una sola categoría.

```txt
Category 1 ──── * Transaction
```

## Requerimientos funcionales

### Categorías

El sistema debe permitir:

- Listar todas las categorías.
- Obtener una categoría por `id`.
- Crear una categoría.
- Actualizar una categoría existente.
- Eliminar una categoría.

### Transacciones

El sistema debe permitir:

- Listar todas las transacciones incluyendo su categoría.
- Obtener una transacción por `id` incluyendo su categoría.
- Crear una transacción asociada a una categoría.
- Actualizar una transacción existente.
- Eliminar una transacción.

### Balance general

El sistema debe exponer `GET /transactions/balance` y retornar:

```json
{
  "totalIncome": 850000,
  "totalExpense": 320000,
  "balance": 530000
}
```

Reglas del balance:

- `totalIncome`: suma de `amount` en transacciones con `type = "income"`.
- `totalExpense`: suma de `amount` en transacciones con `type = "expense"`.
- `balance`: `totalIncome - totalExpense`.
- El cálculo debe vivir en `transactions.controller.ts`.
- El repository solo debe entregar los datos necesarios desde la base de datos.

## Endpoints esperados

| Método | Ruta | Descripción | Respuesta esperada |
| --- | --- | --- | --- |
| GET | `/categories` | Lista categorías. | 200 |
| GET | `/categories/:id` | Obtiene categoría por id. | 200 o 404 |
| POST | `/categories` | Crea categoría. | 201 o 400 |
| PATCH | `/categories/:id` | Actualiza categoría. | 200, 400 o 404 |
| DELETE | `/categories/:id` | Elimina categoría. | 200 o 404 |
| GET | `/transactions` | Lista transacciones con categoría. | 200 |
| GET | `/transactions/:id` | Obtiene transacción por id. | 200 o 404 |
| POST | `/transactions` | Crea transacción. | 201, 400 o 422 |
| PATCH | `/transactions/:id` | Actualiza transacción. | 200, 400, 404 o 422 |
| DELETE | `/transactions/:id` | Elimina transacción. | 200 o 404 |
| GET | `/transactions/balance` | Retorna balance general. | 200 |

## Validaciones

### Category

- `name` debe ser string.
- `name` no puede estar vacío.

### Transaction

- `amount` debe ser número positivo.
- `type` solo puede ser `income` o `expense`.
- `description` es opcional.
- `date` debe representar una fecha válida.
- `categoryId` debe ser número entero positivo.

Si una validación falla, la API debe responder con `400 Bad Request` y detalle del error.

## Manejo de errores esperado

| Caso | Status recomendado |
| --- | --- |
| Recurso no encontrado | 404 |
| Body inválido según Zod | 400 |
| Categoría inexistente al crear transacción | 422 |
| Valor único duplicado, si se define `name @unique` | 409 |
| Error inesperado de base de datos | 500 |

## Criterios de aceptación

- [ ] El proyecto tiene carpetas separadas para routes, controllers, repositories y schemas.
- [ ] Ningún controller importa Prisma directamente.
- [ ] Ninguna route contiene lógica de negocio o validación.
- [ ] Los schemas Zod validan creación y actualización de categorías.
- [ ] Los schemas Zod validan creación y actualización de transacciones.
- [ ] El CRUD de categorías funciona completo.
- [ ] El CRUD de transacciones funciona completo e incluye la categoría en lecturas.
- [ ] `GET /transactions/balance` retorna `totalIncome`, `totalExpense` y `balance` correctamente.
- [ ] El cálculo del balance está en el controller.
- [ ] PostgreSQL se levanta con Docker Compose.
- [ ] El README explica instalación, variables de entorno, migraciones y ejecución.
- [ ] El historial de commits separa funcionalidades principales.

## Plan de implementación sugerido

1. Inicializar proyecto TypeScript con Hono.
2. Configurar Docker Compose con PostgreSQL.
3. Configurar Prisma, `.env`, `prisma.config.ts` y cliente Prisma.
4. Crear modelos `Category` y `Transaction` en Prisma.
5. Ejecutar migración inicial.
6. Implementar CRUD de categorías.
7. Implementar CRUD de transacciones con relación a categoría.
8. Implementar endpoint de balance en el controller de transacciones.
9. Agregar manejo de errores de Prisma.
10. Documentar uso en README.
11. Probar endpoints con Bruno, Postman, HTTPie o curl.

## Riesgos principales

| Riesgo | Mitigación |
| --- | --- |
| Mezclar responsabilidades entre capas. | Revisar que Prisma solo aparezca en repositories y `lib/prisma.ts`. |
| Calcular balance en repository. | Mantener el cálculo explícitamente en `transactions.controller.ts`. |
| Enviar `amount` negativo. | Validar con Zod usando número positivo. |
| Fallos por imports ESM. | Usar extensiones `.js` en imports locales si el proyecto usa `moduleResolution: NodeNext`. |
| Base de datos sin migraciones. | Documentar y ejecutar `prisma migrate dev`. |

## Entregables

- Repositorio GitHub con código fuente completo.
- `docker-compose.yml` funcional.
- `README.md` con instrucciones claras.
- Video explicativo de 5 a 10 minutos mostrando la API y explicando la arquitectura.
- Archivo `.txt` para EVA con integrantes, URL del repositorio, URL del video y fecha de entrega.

## Declaración de uso de IA

El README deberá declarar el uso de IA si se utilizó durante el desarrollo, indicando qué herramienta se usó y para qué tareas. El equipo debe poder explicar cada archivo, función y decisión arquitectónica en el video.
