# Guía de Estudio — Unidad 2: Arquitectura N-Layer con Hono + Prisma

**Ramo:** Desarrollo de Aplicaciones Web II

**Stack:** TypeScript + Hono + Prisma + Zod + Docker + PostgreSQL

**App de ejemplo:** API de Notas con categorías y etiquetas

---

## ¿Qué pregunta responde esta unidad?

¿Cómo organizo un microservicio para que cuando el proyecto crezca —o cuando cambie la base de datos, o el ORM, o la lógica— no tenga que reescribir todo desde cero?

En la Unidad 1 montaste una API funcional. Funcionaba, pero todo vivía junto: rutas, lógica, datos. En esta unidad separas esas responsabilidades en capas, incorporas una base de datos real con Prisma, levantas esa base de datos con Docker, y aprendes a manejar operaciones asíncronas con Promesas y async/await.

---

## 1. Stack y versiones

Antes de escribir una sola línea de código, es importante entender qué herramienta hace qué cosa y por qué la estamos usando. En desarrollo profesional no se elige una tecnología porque "es popular" — se elige porque resuelve un problema concreto.

| Herramienta | Versión | Qué es | Por qué la usamos |
| --- | --- | --- | --- |
| Node.js | LTS (22.x) | Entorno de ejecución de JavaScript en el servidor | Base del stack, corre nuestro servidor |
| TypeScript | 5.x | JavaScript con tipos estáticos | Detecta errores antes de ejecutar |
| Hono | 4.x | Micro-framework HTTP para Node.js y edge | Routing y middleware sin imponer estructura |
| Prisma | 7.x | ORM para Node.js y TypeScript | Interactuar con la BD usando TypeScript, sin SQL directo |
| PostgreSQL | 16 | Base de datos relacional robusta | BD de producción real, con la que trabajarás en la mayoría de proyectos |
| Docker | — | Plataforma de contenedores | Levantar PostgreSQL sin instalarlo directamente en la máquina |
| Zod | 4.x | Librería de validación de esquemas | Validar datos de entrada con tipos TypeScript automáticos |

---

## 2. Promesas y el Event Loop

Antes de escribir una sola query con Prisma, necesitas entender por qué todas sus funciones son asíncronas. Para eso hay que entender cómo funciona Node.js por dentro.

### El Event Loop

Node.js es **single-threaded**: tiene un solo hilo de ejecución. A diferencia de otros lenguajes como Java que crean un nuevo hilo por cada petición, Node.js atiende todas las peticiones en el mismo hilo.

¿Cómo puede ser eficiente entonces? Con el **Event Loop**.

Cuando Node.js hace una operación de I/O (leer la BD, leer un archivo, hacer una petición HTTP), **no bloquea el hilo esperando**. Delega esa operación al sistema operativo y sigue atendiendo otras peticiones. Cuando la operación termina, el callback vuelve a la cola y se ejecuta.

Eso es lo que hace a Node.js eficiente para APIs: puede atender miles de peticiones concurrentes con un solo hilo, porque casi nunca está esperando — siempre está haciendo algo.

### ¿Qué es una Promesa?

Una **Promesa** (`Promise`) es un objeto que representa el resultado eventual de una operación asíncrona. Puede estar en tres estados:

- **Pending** → la operación todavía no terminó
- **Fulfilled** → terminó con éxito, tiene un valor
- **Rejected** → terminó con error, tiene una razón

Antes de las Promesas, el código asíncrono se manejaba con callbacks anidados — lo que se conoce como "callback hell":

```tsx
// ❌ Callbacks anidados — difícil de leer y mantener
getUser(id, (err, user) => {
  if (err) return handleError(err)
  getPosts(user.id, (err, posts) => {
    if (err) return handleError(err)
    getComments(posts[0].id, (err, comments) => {
      // ...y así infinitamente
    })
  })
})
```

Las Promesas resuelven eso:

```tsx
// ✅ Con Promesas — encadenado y más legible
getUser(id)
  .then(user => getPosts(user.id))
  .then(posts => getComments(posts[0].id))
  .catch(err => handleError(err))
```

### async/await — azúcar sintáctica sobre Promesas

`async/await` es simplemente una forma más legible de trabajar con Promesas. No es algo nuevo — por debajo sigue siendo una Promesa.

```tsx
// Con .then()
const getNote = (id: number): Promise<Note | null> => {
  return prisma.note.findUnique({ where: { id } })
    .then(note => note)
    .catch(() => null)
}

// Con async/await — hace exactamente lo mismo
const getNote = async (id: number): Promise<Note | null> => {
  const note = await prisma.note.findUnique({ where: { id } })
  return note
}
```

**Las reglas:**

- `async` declara que la función devuelve una Promesa
- `await` pausa la ejecución de esa función hasta tener el resultado — pero **no bloquea el Event Loop**, solo "pausa" esa función
- Si la Promesa se rechaza, `await` lanza un error que puedes capturar con `try/catch`

```tsx
// Manejo de errores con async/await
const createNote = async (data: CreateNoteInput): Promise<Note> => {
  try {
    return await prisma.note.create({ data })
  } catch (error) {
    throw new Error('No se pudo crear la nota')
  }
}
```

> **Regla práctica:** si usas Prisma, la función es `async` y cada llamada a Prisma lleva `await`.
> 

---

## 3. Configuración del proyecto

### Package manager — corepack + yarn

Este proyecto usa **yarn** como package manager gestionado por **corepack** (incluido en Node.js 22.x). Corepack garantiza que todos los integrantes usen la misma versión sin instalación manual.

```bash
# Activar corepack (una sola vez por máquina)
corepack enable

# Inicializar un proyecto nuevo con yarn
yarn init -2
```

### tsconfig.json

Con Node.js 22.x y ESM nativo, la configuración usa `NodeNext` para `module` y `moduleResolution`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*", "prisma.config.ts"]
}
```

### Imports con extensión `.js` — por qué son obligatorios

Con `moduleResolution: NodeNext`, TypeScript no resuelve imports sin extensión. Todos los imports locales deben incluir `.js` — incluso cuando el archivo fuente es `.ts`:

```tsx
// ❌ Falla con NodeNext
import { notesRepository } from '../repositories/notes.repository'

// ✅ Correcto
import { notesRepository } from '../repositories/notes.repository.js'
```

TypeScript entiende que `.js` en el import se resuelve al `.ts` correspondiente en tiempo de compilación. Es contraintuitivo pero es el estándar de ESM en Node.js.

### Build con tsdown

**tsdown** compila el proyecto para producción. Es más rápido que `tsc` directo y genera un bundle limpio.

```bash
yarn add -D tsdown
```

```tsx
// tsdown.config.ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  outDir: 'dist',
  clean: true,
  shims: true,
})
```

```json
// package.json — scripts
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsdown",
    "start": "node dist/index.js"
  }
}
```

> **¿Por qué tsdown y no `tsc`?** `tsc` solo transpila — no bundlea. `tsdown` genera un archivo optimizado para producción y es considerablemente más rápido.
> 

---

## 4. Arquitectura N-Layer

### ¿Qué es?

N-Layer (N capas) es una forma de organizar el código separando cada responsabilidad en su propia capa. Cada capa sabe lo que le toca hacer y nada más.

| Capa | Responsabilidad |
| --- | --- |
| Routes | Define los endpoints. Nada más. |
| Controller | Recibe el request, valida, llama al repository, responde. |
| Repository | Habla con la base de datos. Solo eso. |
| BD | PostgreSQL via Prisma |

La capa `schemas/` no es una capa de ejecución — es una capa de contratos. Define la forma que deben tener los datos y los tipos que fluyen entre las otras capas.

### ¿Por qué separar?

Imagina que mañana cambias de PostgreSQL a MongoDB. Si todo está mezclado, tienes que tocar cada controller. Si usas repositorio, solo cambias el repositorio — el resto del sistema no se entera.

**Cada capa tiene exactamente un motivo para cambiar.**

### Estructura de carpetas

La arquitectura N-Layer se **replica para cada recurso**. El proyecto completo tiene esta estructura:

```jsx
src/
├── routes/
│   ├── notes.routes.ts       ← GET /notes, POST /notes, etc.
│   ├── categories.routes.ts  ← GET /categories, POST /categories, etc.
│   └── tags.routes.ts        ← GET /tags, POST /tags, etc.
├── controllers/
│   ├── notes.controller.ts
│   ├── categories.controller.ts
│   └── tags.controller.ts
├── repositories/
│   ├── notes.repository.ts
│   ├── categories.repository.ts
│   └── tags.repository.ts
├── schemas/
│   ├── notes.schema.ts
│   ├── categories.schema.ts
│   └── tags.schema.ts
├── lib/
│   ├── prisma.ts             ← Singleton de Prisma Client.
│   └── prisma-errors.ts      ← Helper centralizado de errores.
└── index.ts                  ← Entry point + montaje de routers.
```

> **¿Por qué `lib/`?** Es la carpeta de utilidades compartidas que no pertenecen a ninguna capa específica. El singleton de Prisma va aquí porque es usado por todos los repositories. Los helpers como `parsePrismaError` también van aquí porque son transversales a todos los controllers.
> 

---

## 5. La capa Schemas — el contrato de los datos

Los schemas definen la forma que deben tener los datos de entrada. Se colocan en su propia capa porque son usados tanto por el controller (para validar) como por el repository (como tipos de parámetro).

```tsx
// schemas/notes.schema.ts
import * as z from 'zod' // Zod v4: import * as z from 'zod'

export const createNoteSchema = z.object({
  title:      z.string().min(1).max(100),
  content:    z.string().min(1),
  categoryId: z.number().int().positive()
})

export const updateNoteSchema = z.object({
  title:   z.string().min(1).max(100).optional(),
  content: z.string().min(1).optional()
})

export type CreateNoteInput = z.infer<typeof createNoteSchema>
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>
```

> **Zod v4:** el import cambió de `import { z } from 'zod'` a `import * as z from 'zod'`. El resto de la API (`safeParse`, `z.infer`, `.object()`, `.string()`) es idéntico.
> 

`z.infer<typeof schema>` extrae el tipo TypeScript del schema. Así tienes una sola fuente de verdad: el schema define la validación en runtime y el tipo en compile time.

### Cheat sheet de Zod

| Validador | Qué hace |
| --- | --- |
| `z.string()` | string |
| `z.string().min(1)` | string no vacío |
| `z.string().email()` | email válido |
| `z.number().int()` | entero |
| `z.number().positive()` | positivo |
| `z.boolean()` | boolean |
| `z.array(z.string())` | array de strings |
| `.optional()` | campo opcional |
| `z.infer<typeof s>` | inferir tipo TypeScript |

---

## 6. Tipos extendidos de Prisma — NoteWithRelations

Cuando usas `include` en una query, Prisma devuelve un tipo que incluye las relaciones. Pero la interfaz del repository usa `Note` como tipo base, que **no incluye** esas relaciones.

```tsx
// ❌ Problema: Note no incluye category ni tags
const note: Note = await prisma.note.findUnique({
  where: { id: 1 },
  include: { category: true, tags: { include: { tag: true } } }
})
// TypeScript error: el tipo devuelto no es Note
```

Solución: definir un tipo extendido usando `Prisma.NoteGetPayload`:

```tsx
// repositories/notes.repository.ts
import { Prisma } from '../../generated/client'

// Tipo que describe una nota con sus relaciones incluidas
export type NoteWithRelations = Prisma.NoteGetPayload<{
  include: {
    category: true
    tags: { include: { tag: true } }
  }
}>
```

Este tipo es generado automáticamente por Prisma a partir del schema — si cambias el schema y regeneras el cliente, el tipo se actualiza solo.

La interfaz del repository usa `NoteWithRelations` para `findAll` y `findById`, y `Note` para operaciones de escritura:

```tsx
interface NoteRepository {
  findAll: () => Promise<NoteWithRelations[]>
  findById: (id: number) => Promise<NoteWithRelations | null>
  create: (data: CreateNoteInput) => Promise<Note>
  update: (id: number, data: UpdateNoteInput) => Promise<Note>
  remove: (id: number) => Promise<void>
}
```

---

## 7. La capa Repository — el contrato irrompible

El repositorio es la única capa que habla con la base de datos. El controller no sabe si los datos vienen de PostgreSQL, MongoDB o un archivo JSON. Solo sabe que le pide datos al repositorio y el repositorio los entrega.

La clave está en la **interfaz**: define el contrato que cualquier implementación debe cumplir. Si mañana cambias de Prisma a otra tecnología, creas un nuevo objeto que cumpla esa misma interfaz — sin tocar nada más.

```tsx
// repositories/notes.repository.ts
import { prisma } from '../lib/prisma'
import type { CreateNoteInput, UpdateNoteInput } from '../schemas/notes.schema'
import type { Note } from '../../generated/client'
import type { NoteWithRelations } from './notes.repository.js'

// La interfaz es el contrato irrompible.
// Usa NoteWithRelations para lecturas (incluyen relaciones) y Note para escrituras.
interface NoteRepository {
  findAll: () => Promise<NoteWithRelations[]>
  findById: (id: number) => Promise<NoteWithRelations | null>
  create: (data: CreateNoteInput) => Promise<Note>
  update: (id: number, data: UpdateNoteInput) => Promise<Note>
  remove: (id: number) => Promise<void>
}

// La implementación — objeto literal que cumple el contrato usando Prisma
export const notesRepository: NoteRepository = {
  findAll: () =>
    prisma.note.findMany({
      include: { category: true, tags: { include: { tag: true } } }
    }),

  findById: (id) =>
    prisma.note.findUnique({
      where: { id },
      include: { category: true, tags: { include: { tag: true } } }
    }),

  create: (data) =>
    prisma.note.create({ data }),

  update: (id, data) =>
    prisma.note.update({ where: { id }, data }),

  remove: (id) =>
    prisma.note.delete({ where: { id } }).then(() => undefined)
}
```

### ¿Por qué importa la interfaz?

```tsx
// Hoy:
export const notesRepository: NoteRepository = {
  findAll: () => prisma.note.findMany(/* ... */)
}

// Mañana, si cambias de tecnología:
export const notesRepository: NoteRepository = {
  findAll: () => mongoCollection.find({}).toArray()
}
```

El controller, las rutas, los schemas — nada de eso cambia. Solo el repositorio.

---

## 8. Manejo de errores de Prisma

El `try/catch` genérico que devuelve 404 para todo es un antipatrón. Prisma lanza errores tipados con códigos específicos — ignorarlos significa devolver status codes incorrectos.

### PrismaClientKnownRequestError

Cuando Prisma falla por una condición conocida de base de datos, lanza `PrismaClientKnownRequestError` con un código `P2xxx`:

| Código | Causa | Status HTTP correcto |
| --- | --- | --- |
| `P2002` | Violación de unicidad (campo `@unique`) | `409 Conflict` |
| `P2003` | Foreign key inválida (ej: `categoryId` que no existe) | `422 Unprocessable Entity` |
| `P2025` | Registro no encontrado (update/delete de algo que no existe) | `404 Not Found` |
| Otro | Error de BD no mapeado | `500 Internal Server Error` |

### Helper centralizado — `lib/prisma-errors.ts`

En lugar de repetir el mismo `instanceof` en cada controller, se centraliza en `lib/`:

```tsx
// lib/prisma-errors.ts
import { Prisma } from '../../generated/client.js'

export type PrismaErrorResponse = {
  status: number
  message: string
}

export const parsePrismaError = (error: unknown): PrismaErrorResponse => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return { status: 409, message: `Ya existe un registro con ese valor (${error.meta?.target})` }
      case 'P2003':
        return { status: 422, message: 'Referencia inválida — el recurso relacionado no existe' }
      case 'P2025':
        return { status: 404, message: 'Registro no encontrado' }
      default:
        return { status: 500, message: `Error de base de datos: ${error.code}` }
    }
  }
  return { status: 500, message: 'Error interno del servidor' }
}
```

### Uso en el controller

```tsx
import { parsePrismaError } from '../lib/prisma-errors.js'

export const createNote = async (c: Context) => {
  const body = await c.req.json()
  const result = createNoteSchema.safeParse(body)
  if (!result.success) return c.json({ errors: result.error.issues }, 400)

  try {
    const note = await notesRepository.create(result.data)
    return c.json(note, 201)
  } catch (error) {
    const { status, message } = parsePrismaError(error)
    return c.json({ error: message }, status)
  }
}

export const deleteNote = async (c: Context) => {
  const id = Number(c.req.param('id'))
  try {
    await notesRepository.remove(id)
    return c.json({ message: 'Nota eliminada' })
  } catch (error) {
    const { status, message } = parsePrismaError(error)
    return c.json({ error: message }, status)
  }
}
```

---

## 9. La capa Controller

El controller coordina: recibe el request, valida los datos con Zod, llama al repository y devuelve la respuesta. Nada más.

```tsx
// controllers/notes.controller.ts
import type { Context } from 'hono'
import { notesRepository } from '../repositories/notes.repository'
import { createNoteSchema, updateNoteSchema } from '../schemas/notes.schema'

export const getNotes = async (c: Context) => {
  const notes = await notesRepository.findAll()
  return c.json(notes)
}

export const getNoteById = async (c: Context) => {
  const id = Number(c.req.param('id'))
  const note = await notesRepository.findById(id)
  if (!note) return c.json({ error: 'Nota no encontrada' }, 404)
  return c.json(note)
}

export const createNote = async (c: Context) => {
  const body = await c.req.json()
  const result = createNoteSchema.safeParse(body)
  if (!result.success) return c.json({ errors: result.error.issues }, 400)
  const note = await notesRepository.create(result.data)
  return c.json(note, 201)
}

export const updateNote = async (c: Context) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const result = updateNoteSchema.safeParse(body)
  if (!result.success) return c.json({ errors: result.error.issues }, 400)
  try {
    const note = await notesRepository.update(id, result.data)
    return c.json(note)
  } catch {
    return c.json({ error: 'Nota no encontrada' }, 404)
  }
}

export const deleteNote = async (c: Context) => {
  const id = Number(c.req.param('id'))
  try {
    await notesRepository.remove(id)
    return c.json({ message: 'Nota eliminada' })
  } catch {
    return c.json({ error: 'Nota no encontrada' }, 404)
  }
}
```

### ❌ / ✅ Qué hace y qué no hace el controller

❌ **Mal — el controller accede a Prisma directamente**

```tsx
export const createNote = async (c: Context) => {
  const body = await c.req.json()
  // ❌ El controller conoce Prisma — si cambia el ORM, toca el controller
  const note = await prisma.note.create({ data: body })
  return c.json(note, 201)
}
```

✅ **Bien — el controller delega al repository**

```tsx
export const createNote = async (c: Context) => {
  const body = await c.req.json()
  const result = createNoteSchema.safeParse(body)
  if (!result.success) return c.json({ errors: result.error.issues }, 400)
  // ✅ El controller no sabe de dónde vienen los datos
  const note = await notesRepository.create(result.data)
  return c.json(note, 201)
}
```

---

## 10. La capa Routes

Las rutas solo mapean URLs a controllers. Sin lógica, sin validaciones, sin acceso a datos.

```tsx
// routes/notes.routes.ts
import { Hono } from 'hono'
import { getNotes, getNoteById, createNote, updateNote, deleteNote, addTagToNote, removeTagFromNote } from '../controllers/notes.controller.js'

const notesRouter = new Hono()

notesRouter.get('/',                   getNotes)
notesRouter.get('/:id',               getNoteById)
notesRouter.post('/',                  createNote)
notesRouter.patch('/:id',             updateNote)
notesRouter.delete('/:id',            deleteNote)
notesRouter.post('/:id/tags',         addTagToNote)      // asociar tag
notesRouter.delete('/:id/tags/:tagId', removeTagFromNote) // desasociar tag

export default notesRouter
```

### Montar múltiples routers en index.ts

Cada recurso tiene su propio router. Se montan todos en el entry point:

```tsx
// index.ts
import 'dotenv/config' // ← debe ser el primer import, antes de todo lo demás
import { Hono } from 'hono'
import notesRouter from './routes/notes.routes.js'
import categoriesRouter from './routes/categories.routes.js'
import tagsRouter from './routes/tags.routes.js'

const app = new Hono()

app.route('/notes',      notesRouter)
app.route('/categories', categoriesRouter)
app.route('/tags',       tagsRouter)

export default app
```

### Tabla de rutas completa

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | /notes | Lista todas las notas |
| GET | /notes/:id | Detalle de una nota |
| POST | /notes | Crea una nota |
| PATCH | /notes/:id | Actualiza una nota |
| DELETE | /notes/:id | Elimina una nota |
| POST | /notes/:id/tags | Asocia un tag a una nota |
| DELETE | /notes/:id/tags/:tagId | Desasocia un tag de una nota |
| GET | /categories | Lista todas las categorías |
| GET | /categories/:id | Detalle de una categoría |
| POST | /categories | Crea una categoría |
| PATCH | /categories/:id | Actualiza una categoría |
| DELETE | /categories/:id | Elimina una categoría |
| GET | /tags | Lista todos los tags |
| GET | /tags/:id | Detalle de un tag |
| POST | /tags | Crea un tag |
| PATCH | /tags/:id | Actualiza un tag |
| DELETE | /tags/:id | Elimina un tag |

---

## 11. Prisma 7 — ORM para TypeScript

### ¿Qué es un ORM?

ORM = Object-Relational Mapper. Traduce entre el mundo de objetos (TypeScript) y el mundo de tablas (SQL). En vez de escribir `SELECT * FROM notes WHERE id = 1`, escribes `prisma.note.findUnique({ where: { id: 1 } })`.

**¿Por qué Prisma y no SQL crudo?**

- **Type-safe:** si te equivocas en el nombre de un campo, TypeScript te lo dice antes de ejecutar
- **Migraciones:** Prisma controla los cambios en el schema de BD de forma ordenada y reproducible
- **Relaciones:** las queries con `include` manejan JOINs sin escribir SQL manual

### Instalación

```bash
# ORM + cliente generado + driver adapter para PostgreSQL
yarn add prisma @prisma/client @prisma/adapter-pg pg dotenv
yarn add -D @types/pg

# Inicializa el proyecto — crea prisma/schema.prisma
yarn prisma init
```

> **Prisma 7 requiere un driver adapter.** A diferencia de versiones anteriores, `new PrismaClient()` sin argumentos ya no es válido. El adapter conecta Prisma con el driver nativo de la base de datos.
> 

### prisma.config.ts — configuración central

Prisma 7 introduce `prisma.config.ts` como archivo central de configuración. La URL de la base de datos ya **no va en `schema.prisma`** — va aquí:

```tsx
// prisma.config.ts (en la raíz del proyecto)
import 'dotenv/config' // carga el .env para los comandos del CLI (migrate, studio, etc.)
import { defineConfig, env } from 'prisma/config'

type Env = {
  DATABASE_URL: string
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env<Env>('DATABASE_URL'), // type-safe: lanza error explícito si falta la variable
  },
})
```

```bash
# .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/notesdb"
```

> Agrega `.env` a tu `.gitignore`. Nunca subas credenciales a un repositorio.
> 

> **¿Por qué `import 'dotenv/config'` en dos lugares?** `prisma.config.ts` es leído por el CLI de Prisma — carga el `.env` para comandos como `migrate` y `studio`. Pero el servidor corre en un proceso distinto: cuando ejecutas `yarn dev`, Node.js no sabe nada del `.env` a menos que tú lo cargues. Por eso también hay que hacerlo en el entry point.
> 

### Schema — App de Notas

El schema define los modelos: las tablas, sus campos y las relaciones. En Prisma 7 el `generator` usa `"prisma-client"` (no `"prisma-client-js"`), requiere `output` explícito, y el `datasource` ya no lleva `url`.

```
generator client {
  provider = "prisma-client"
  output   = "../generated/client"
}

datasource db {
  provider = "postgresql"
  // La URL va en prisma.config.ts, no aquí
}

model Category {
  id    Int    @id @default(autoincrement())
  name  String @unique
  notes Note[]
}

model Tag {
  id    Int       @id @default(autoincrement())
  name  String    @unique
  notes NoteTag[]
}

model Note {
  id         Int       @id @default(autoincrement())
  title      String
  content    String
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  category   Category  @relation(fields: [categoryId], references: [id])
  categoryId Int
  tags       NoteTag[]
}

model NoteTag {
  note   Note @relation(fields: [noteId], references: [id])
  noteId Int
  tag    Tag  @relation(fields: [tagId], references: [id])
  tagId  Int

  @@id([noteId, tagId])
}
```

### Singleton de Prisma — con driver adapter

En Prisma 7, `new PrismaClient()` requiere un driver adapter explícito. Los tipos se importan desde el path del `output` definido en el schema.

```tsx
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })

export const prisma = new PrismaClient({ adapter })
```

> **¿Por qué el adapter?** Prisma 7 separa el cliente ORM del driver de base de datos. Esto permite usar el mismo ORM con diferentes motores (pg, neon, libsql, etc.) sin cambiar el código de la aplicación.
> 

### Relaciones en Prisma

**One-to-Many (Note → Category)** — Una nota pertenece a una categoría. Muchas notas pueden tener la misma categoría.

```tsx
prisma.note.create({
  data: { title: 'Mi nota', content: '...', categoryId: 1 }
})

prisma.note.findUnique({
  where: { id: 1 },
  include: { category: true }
})
```

**Many-to-Many (Note ↔ Tag)** — Una nota puede tener muchas etiquetas. Una etiqueta puede estar en muchas notas. La tabla intermedia `NoteTag` gestiona esa relación.

```tsx
// Leer: nota con sus tags
prisma.note.findUnique({
  where: { id: 1 },
  include: { tags: { include: { tag: true } } }
})

// Asociar un tag a una nota — crear registro en NoteTag
prisma.noteTag.create({
  data: { noteId: 1, tagId: 3 }
})

// Desasociar un tag de una nota — la clave compuesta @@id([noteId, tagId])
prisma.noteTag.delete({
  where: { noteId_tagId: { noteId: 1, tagId: 3 } }
})
```

> `@@id([noteId, tagId])` define una **clave primaria compuesta**. Prisma la expone como `noteId_tagId` en las queries de `where`. Es lo que garantiza que no puedas asociar el mismo tag dos veces a la misma nota.
> 

### Queries esenciales

```tsx
prisma.note.findMany({
  include: { category: true, tags: { include: { tag: true } } }
})

prisma.note.findUnique({ where: { id: 1 } })
prisma.note.create({ data: { title: '...', content: '...', categoryId: 1 } })
prisma.note.update({ where: { id: 1 }, data: { title: 'Nuevo título' } })
prisma.note.delete({ where: { id: 1 } })
prisma.note.findMany({ where: { categoryId: 2 } })
```

### Comandos esenciales de Prisma

```bash
yarn prisma migrate dev --name nombre-descriptivo  # Crear y aplicar migración
yarn prisma studio                                  # Interfaz visual
yarn prisma generate                               # Regenerar cliente
yarn prisma migrate status                         # Ver estado de migraciones
```

---

## 12. Docker — PostgreSQL como servicio externo

### La idea

No instalas PostgreSQL en tu máquina. Lo levantas como un contenedor Docker. Cuando no lo necesitas, lo apagas. Tu máquina queda limpia.

Este es exactamente el modelo de microservicios: **cada servicio corre de forma independiente y puede ser reemplazado sin afectar a los demás**. Tu API no sabe si PostgreSQL corre en Docker, en un servidor remoto o en la nube — solo sabe la URL de conexión.

### docker-compose.yml

```yaml
version: '3.8'

services:
  db:
    image: postgres:16
    container_name: notes_db
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: notesdb
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

El bloque `volumes` hace que los datos persistan aunque el contenedor se detenga. Sin él, cada vez que apagas el contenedor pierdes todo.

### Comandos esenciales de Docker

```bash
docker compose up -d       # Levantar en background
docker compose ps          # Ver contenedores corriendo
docker compose logs db     # Ver logs de la BD
docker compose stop        # Detener (datos persisten)
docker compose down        # Detener y borrar contenedores
docker compose down -v     # Borrar TODO incluyendo datos
```

### Flujo de trabajo diario

```bash
docker compose up -d
yarn prisma migrate dev --name descripcion
yarn dev
# Al terminar:
docker compose stop
```

---

## 13. Flujo completo — Cómo se conecta todo

Flujo de `POST /notes` atravesando todas las capas:

1. **Cliente** envía `POST /notes` con `{ title, content, categoryId }`
2. **Routes** → registra el endpoint, llama a `createNote` controller
3. **Controller** → extrae el body, valida con `createNoteSchema.safeParse(body)`. Si falla: devuelve 400. Si pasa: llama a `notesRepository.create(result.data)`
4. **Repository** → ejecuta `prisma.note.create(data)`, devuelve la nota creada
5. **Controller** → devuelve 201 con la nota
6. **Cliente** recibe la respuesta

**Lo que NO tuviste que tocar si cambias la BD:**

- ✅ Routes — sin cambios
- ✅ Controller — sin cambios
- ✅ Schemas — sin cambios
- Solo cambia el repository

**Eso es el valor de N-Layer.**

---

## 14. Testing de la API

Antes de conectar un frontend, necesitas una forma de probar tus endpoints directamente. Estas son las herramientas más usadas:

| Herramienta | Tipo | Cuándo usarla |
| --- | --- | --- |
| **Bruno** | GUI, archivos versionables | La que usamos en clases — guarda las requests como archivos en el repo |
| **Postman** | GUI, basada en nube | Alternativa popular, buena para equipos |
| **curl** | CLI | Útil para scripts y entornos sin interfaz gráfica |
| **HTTPie** | CLI | Alternativa más legible a curl |

**Bruno** es la opción recomendada para este ramo porque las colecciones se guardan como archivos `.bru` dentro del repositorio — el equipo comparte las requests igual que comparte el código.

```bash
# Ejemplo con curl
curl -X POST http://localhost:3000/notes \
  -H 'Content-Type: application/json' \
  -d '{"title": "Mi nota", "content": "Contenido", "categoryId": 1}'

# Ejemplo con HTTPie
http POST localhost:3000/notes title="Mi nota" content="Contenido" categoryId:=1
```

---

## 15. Errores frecuentes

| Error | Causa | Solución |
| --- | --- | --- |
| `Can't reach database server` | La BD no está corriendo | `docker compose up -d` |
| `P2002: Unique constraint failed` | Valor duplicado en campo único | Verificar que el dato no exista antes de crear |
| `P2025: Record not found` | Actualizar o eliminar algo que no existe | Usar `try/catch` en el controller |
| `Environment variable not found: DATABASE_URL` | Falta el `.env` | Crear `.env` con `DATABASE_URL` |
| Zod: `Expected number, received string` | El campo llega como string | Verificar que el cliente envía el tipo correcto |
| `@prisma/client did not initialize yet` | Falta generar el cliente | `yarn prisma generate` |
| BD sin tablas esperadas | Falta correr la migración | `yarn prisma migrate dev --name init` |
| Volumen de Docker con schema antiguo | Cambiaste el schema pero la BD no | `yarn prisma migrate dev --name descripcion` |

---

## 16. Tips si usas IA como asistente

La IA puede ayudarte a generar código rápido, pero tiene un problema: si no le dices exactamente qué arquitectura quieres, va a tomar sus propias decisiones — y puede generarte código Prisma 6 cuando usas Prisma 7, clases cuando querías funciones, o mezclar Prisma en el controller cuando tenías un repositorio.

**Antes de pedirle código, dale el contexto completo:**

```
Estoy construyendo una API con Hono y TypeScript usando Prisma 7.
Arquitectura N-Layer: routes → controller → repository.
No hay capa de servicio porque la aplicación es pequeña.
Estilo funcional: sin clases, todo como funciones o objetos literales.
Los schemas de Zod (v4) están en src/schemas/ y definen los tipos con z.infer.
El repository tiene una interfaz TypeScript explícita en el mismo archivo.
La implementación usa Prisma con PrismaPg adapter.
Los tipos de Prisma se importan desde '../../generated/client'.
Necesito que generes [X].
```

**Reglas de oro al usar IA en arquitectura:**

- **Sé explícito con las capas.** Si no le dices qué va en cada capa, lo mezcla.
- **Dile la versión de Prisma.** Sin eso generará código Prisma 6 con `prisma-client-js` y sin adapter.
- **Dile el estilo.** "Sin clases", "funcional", "objetos literales" — sin eso, la IA tira clases por defecto.
- **Un archivo a la vez.** No le pidas "toda la API" de un golpe — pide capa por capa.
- **Tú decides la arquitectura.** La IA propone, tú validas. Si no entiendes lo que generó, no lo uses.

---

## 17. Comandos de referencia rápida

```bash
# Docker
docker compose up -d           # Levantar BD
docker compose stop            # Detener BD
docker compose ps              # Ver estado
docker compose logs db         # Ver logs

# Prisma
yarn prisma migrate dev        # Crear y aplicar migración
yarn prisma studio             # Abrir interfaz visual
yarn prisma generate           # Regenerar cliente

# Dev
yarn dev                       # Iniciar servidor
```

---

## 18. Recursos

- [Prisma Docs](https://www.prisma.io/docs)
- [Prisma — Driver Adapters](https://www.prisma.io/docs/orm/overview/databases/database-drivers)
- [Prisma — Relations](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations)
- [Zod Docs](https://zod.dev)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Hono Docs](https://hono.dev)
- [JavaScript Event Loop — Jake Archibald](https://www.youtube.com/watch?v=cCOL7MC4Pl0) — la mejor explicación visual del Event Loop
- [http.cat](http://http.cat) — referencia visual de status HTTP
- [Código de referencia — Unidad 2](https://github.com/borisbelmar/hono-api/tree/unidad-2) — repositorio con la implementación completa del material de esta unidad
