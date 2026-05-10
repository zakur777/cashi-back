# Evaluación Unidad 2 — Cashi: API de Finanzas Personales

**Ramo:** Desarrollo de Aplicaciones Web II

**Modalidad:** Grupal — hasta 3 personas

**Fecha límite:** Domingo 10 de mayo de 2026, 23:59

---

## Contexto del proyecto

**Cashi** es una startup que quiere lanzar una aplicación móvil de finanzas personales. Mientras el equipo de frontend construye la app, te contratan a ti (o a tu equipo) para construir el backend: una API REST que permita registrar ingresos y egresos, organizarlos por categoría, y consultar el balance general de la cuenta.

El cliente no sabe nada de código — lo que le importa es que los endpoints funcionen, que los datos se guarden correctamente y que el balance siempre refleje la realidad.

Este es tu primer proyecto real con arquitectura N-Layer y base de datos. La guía de estudio de la Unidad 2 tiene exactamente la estructura que se pide — úsala como referencia.

---

## Modelo de datos

### Category

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | número | Identificador único, generado automáticamente |
| `name` | texto | Nombre de la categoría (ej: "Alimentación", "Sueldo") |

### Transaction

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | número | Identificador único, generado automáticamente |
| `amount` | número | Monto de la transacción. Siempre positivo. |
| `type` | texto | Tipo: `income` (ingreso) o `expense` (egreso) |
| `description` | texto | Descripción opcional de la transacción |
| `date` | fecha | Fecha de la transacción, ingresada por el usuario |
| `categoryId` | número | Referencia a la categoría |

Una transacción pertenece a una categoría. Una categoría puede tener muchas transacciones.

---

## Requerimientos funcionales

### Gestión de categorías (CRUD completo)

- Listar todas las categorías
- Ver el detalle de una categoría
- Crear una nueva categoría
- Editar una categoría existente
- Eliminar una categoría

### Gestión de transacciones (CRUD completo)

- Listar todas las transacciones (incluyendo su categoría)
- Ver el detalle de una transacción
- Crear una nueva transacción
- Editar una transacción existente
- Eliminar una transacción

### Balance general

`GET /transactions/balance` debe retornar un resumen con:

```json
{
  "totalIncome": 850000,
  "totalExpense": 320000,
  "balance": 530000
}
```

- `totalIncome`: suma de todos los `amount` donde `type === "income"`
- `totalExpense`: suma de todos los `amount` donde `type === "expense"`
- `balance`: `totalIncome - totalExpense`-

> El cálculo del balance debe vivir en el controller, no en el repository. El repository solo entrega los datos — quién hace la lógica importa y se evalúa.
> 

---

## Requerimientos técnicos

- El proyecto debe estar organizado en arquitectura **N-Layer**: separación clara entre routes, controller y repository. Los schemas de validación deben estar en su propia capa `schemas/`.
- **Stack sugerido:** Node.js + TypeScript + Hono + Prisma + PostgreSQL + Docker + Zod. Es el stack que trabajamos en clases y para el que tienes la guía de estudio como referencia.
- Pueden usar otro lenguaje o framework si se sienten más cómodos con él, **con una condición:** si eligen un framework grande (NestJS, Django, Laravel, Rails, etc.), deben justificar la decisión en el README explicando por qué ese framework es la elección correcta para un microservicio como este. Lo que se evalúa es que entiendan las implicancias de la decisión, no que sigan el stack al pie de la letra.
- La base de datos debe levantarse con **Docker Compose**. El `docker-compose.yml` debe estar incluido en el repositorio.
- El código debe estar en un **repositorio GitHub** con historial de commits descriptivo. Un commit por funcionalidad, no todo en un solo commit al final.
- El proyecto debe tener un `README.md` con instrucciones claras para instalar y levantar el proyecto.

### Tabla de endpoints esperados

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | /categories | Lista todas las categorías |
| GET | /categories/:id | Detalle de una categoría |
| POST | /categories | Crea una categoría |
| PATCH | /categories/:id | Actualiza una categoría |
| DELETE | /categories/:id | Elimina una categoría |
| GET | /transactions | Lista todas las transacciones |
| GET | /transactions/:id | Detalle de una transacción |
| POST | /transactions | Crea una transacción |
| PATCH | /transactions/:id | Actualiza una transacción |
| DELETE | /transactions/:id | Elimina una transacción |
| GET | /transactions/balance | Retorna el balance general |

---

## Entregables

1. **Repositorio en GitHub** con el código fuente completo, el `docker-compose.yml` y un `README.md` que explique cómo instalar y levantar el proyecto.
2. **Video explicativo** — entre 5 y 10 minutos subido a Loom o YouTube (puede ser no listado) donde muestren la API funcionando y expliquen cómo organizaron el código en capas.
3. **Archivo `.txt` enviado por EVA** con los siguientes datos:
    - Nombres de los integrantes del grupo
    - URL del repositorio GitHub
    - URL del video
    - Fecha de entrega

---

## Rúbrica de evaluación

**Total: 100 puntos**

| Criterio | Puntaje | Descripción |
| --- | --- | --- |
| Arquitectura N-Layer | 30 pts | Routes, controller, repository y schemas están claramente separados en carpetas. Cada capa hace solo lo que le corresponde: el repository no maneja HTTP, el controller no importa Prisma directamente, los schemas no contienen lógica de negocio. |
| CRUD funcional | 30 pts | Las operaciones de categories y transactions funcionan correctamente. Los endpoints retornan los status codes adecuados (200, 201, 404). La validación con Zod está presente y los errores se retornan con 400. |
| Balance general | 20 pts | `GET /transactions/balance` retorna el JSON correcto con `totalIncome`, `totalExpense` y `balance`. El cálculo está en el controller, no en el repository ni hardcodeado. |
| Entregables y calidad | 20 pts | El `README.md` permite levantar el proyecto siguiendo sus instrucciones. El `docker-compose.yml` está presente y funciona. El historial de commits es descriptivo. El video muestra la API funcionando y explica la estructura. |

---

## Criterios de descuento

- **−15 pts** si toda la lógica está en un solo archivo sin separación de capas
- **−10 pts** si el controller importa y usa Prisma directamente (sin pasar por el repository)
- **−10 pts** si la base de datos no usa Docker Compose o no está documentado cómo levantarla
- **−5 pts** si el README no existe o no permite levantar el proyecto siguiendo sus instrucciones
- **−5 pts** si el repositorio tiene un solo commit con todo el código

---

## Uso de IA

Pueden usar IA (ChatGPT, Claude, Copilot, etc.) para ayudarse a desarrollar. Si la usaron, deben declararlo en el `README.md` indicando qué herramientas usaron y para qué.

En el video deben ser capaces de explicar el código que entregan: por qué cada archivo está donde está, qué hace cada función, por qué la lógica del balance está en el controller y no en el repository. Si el video no refleja comprensión del código, se evaluará como si no fuera de su autoría.

---

## Consejos antes de empezar

- Lean los requerimientos completos antes de escribir una sola línea de código. Definan las rutas y el schema de Prisma antes de tocar el teclado.
- Empiecen por levantar Docker y crear las migraciones. Si la base de datos no funciona, nada funciona.
- Implementen categories primero — es el recurso más simple y sin dependencias. Transactions depende de que categories exista.
- El endpoint `/transactions/balance` es el más importante para evaluar arquitectura. Piensen bien en qué capa va cada parte del cálculo.
- Hagan commits frecuentes: `feat: add categories crud`, `feat: add transactions crud`, `feat: add balance endpoint`.

---

## Preguntas frecuentes

**¿Puedo usar un framework distinto al del ramo?**

Sí. Lo que se evalúa es que entiendas y apliques la arquitectura N-Layer, no que uses un stack específico. Si eliges un framework grande como NestJS, Django o Laravel, debes justificar esa decisión en el README: explica por qué ese framework es la elección correcta para un microservicio como este. Si no puedes justificarlo, probablemente no era la elección correcta.

**¿El `amount` puede ser negativo?**

No. El `amount` siempre es positivo — el `type` (`income` o `expense`) es lo que determina si suma o resta al balance. Valídenlo con Zod.

**¿Cómo pruebo la API sin frontend?**

Con Bruno, que es la herramienta que usamos en clases. También pueden usar Postman o cualquier cliente HTTP.

**¿Puedo usar IA para ayudarme?**

Sí, con declaración en el README y comprensión demostrada en el video.

**¿Qué pasa si elimino una categoría que tiene transacciones?**

Prisma lanzará un error de foreign key. Pueden manejarlo con un `try/catch` que retorne un 400 con un mensaje claro, o simplemente dejar que falle con 500 — no se evalúa ese caso en esta unidad.
