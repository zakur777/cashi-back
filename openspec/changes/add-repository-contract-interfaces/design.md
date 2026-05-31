# Design: add-repository-contract-interfaces

## Contexto y objetivo

El cambio agregará contratos TypeScript explícitos para la capa repository sin cambiar comportamiento runtime ni abandonar el estilo actual de objetos literales funcionales. La arquitectura seguirá siendo `routes -> controllers -> repositories -> database`; los controllers continuarán importando `categoriesRepository` y `transactionsRepository` con los mismos nombres.

## Enfoque técnico

1. Definir interfaces exportadas junto a cada implementación:
   - `CategoriesRepository` en `src/repositories/categories.repository.ts`.
   - `TransactionsRepository` en `src/repositories/transactions.repository.ts`.
2. Tipar los objetos literales existentes contra sus interfaces:
   - `export const categoriesRepository: CategoriesRepository = { ... }`.
   - `export const transactionsRepository: TransactionsRepository = { ... }`.
3. Mantener todas las funciones, queries Prisma, ordenamientos, `include`, `select` y exports existentes sin reestructurar módulos.
4. Agregar validación de tipos como contrato verificable:
   - script `typecheck`: `tsc --noEmit`.
   - actualizar `verify:ci` a `yarn verify:bootstrap && yarn verify:docs && yarn typecheck && yarn test`, si `typecheck` pasa en verde.

## Estrategia de tipos

- Evitar `any` en contratos y pruebas de contrato.
- Inputs:
  - Reutilizar `CreateCategoryInput` / `UpdateCategoryInput` desde `src/schemas/categories.schema.ts`.
  - Reutilizar `CreateTransactionInput` / `UpdateTransactionInput` desde `src/schemas/transactions.schema.ts`.
- Retornos:
  - Preferir `Promise<T>` en las interfaces para no exponer `PrismaPromise` como requisito público del contrato.
  - Usar tipos generados de Prisma sólo donde aporten precisión estable:
    - categorías: `Category` desde `@prisma/client` para resultados CRUD simples.
    - transacciones con relación: `Prisma.TransactionGetPayload<{ include: { category: true } }>` para preservar que `category` viene incluido.
    - balance: `Prisma.TransactionGetPayload<{ select: { amount: true; type: true } }>` para exponer sólo los campos consumidos por el controller.
  - Definir aliases locales exportables o no exportables según legibilidad, por ejemplo `type TransactionWithCategory = Prisma.TransactionGetPayload<...>`.
- No usar `ReturnType<typeof transactionsRepository.findAll>` dentro de la interfaz principal porque introduce dependencia circular con la implementación. `ReturnType`/`Awaited` sí puede usarse en pruebas de contrato o consumers, como ya hace el controller, después de que el objeto esté tipado.

## TDD y validación

### RED esperado

1. Primero agregar `typecheck` a `package.json`.
2. Agregar una prueba/archivo de contrato de tipos, por ejemplo `tests/repositories/repository-contracts.types.test.ts`, que importe `CategoriesRepository`, `TransactionsRepository`, `categoriesRepository` y `transactionsRepository`.
3. Antes de implementar interfaces, `yarn typecheck` debe fallar porque los tipos exportados aún no existen. Si se ejecuta `yarn test`, también puede fallar por import inexistente; esto es aceptable como RED inicial.

### GREEN esperado

1. Implementar las interfaces y tipar los objetos literales.
2. Ajustar la prueba de contrato para verificar, sin lógica runtime relevante, que los objetos exportados satisfacen sus interfaces. Puede usarse `expectTypeOf` de Vitest o asignaciones type-only como:
   - `const categoriesContract: CategoriesRepository = categoriesRepository;`
   - `const transactionsContract: TransactionsRepository = transactionsRepository;`
3. Ejecutar:
   - `yarn typecheck`
   - `yarn test`
   - `yarn verify:ci` si se actualiza para incluir typecheck.

### Regresión

Los tests HTTP existentes en `tests/categories/categories.http.test.ts` y `tests/transactions/transactions.http.test.ts` deben seguir pasando sin modificar mocks públicos. No deben cambiar status codes, serialización de fechas/montos, validaciones Zod ni manejo de errores Prisma.

## Flujo de datos preservado

- Requests HTTP llegan a routes/controllers.
- Controllers validan con Zod y llaman métodos del repository.
- Repositories delegan a Prisma con las mismas queries actuales.
- Controllers serializan respuestas como hoy, especialmente transacciones (`amount` a número y `date` a ISO string) y balance calculado fuera del repository.

## Archivos esperados a cambiar

- `package.json`
  - Agregar `typecheck`: `tsc --noEmit`.
  - Incluir `yarn typecheck` en `verify:ci` si la ejecución verde confirma que no rompe bootstrap/docs/test.
- `src/repositories/categories.repository.ts`
  - Importar tipos necesarios.
  - Exportar `CategoriesRepository`.
  - Tipar `categoriesRepository` con la interfaz.
- `src/repositories/transactions.repository.ts`
  - Importar tipos Prisma necesarios.
  - Exportar `TransactionsRepository`.
  - Tipar `transactionsRepository` con la interfaz.
- `tests/repositories/repository-contracts.types.test.ts`
  - Nuevo contrato de tipos para RED/GREEN de interfaces y objetos.
- Opcional: `README.md`
  - Mencionar que repositories exponen interfaces TypeScript explícitas si se desea reforzar la evidencia arquitectónica.

## Estimación de revisión

- Código fuente: ~30-55 líneas cambiadas.
- Test de contrato: ~15-35 líneas nuevas.
- `package.json`: ~2 líneas cambiadas.
- README opcional: ~1-5 líneas.
- Total previsto: ~50-95 líneas, bajo el presupuesto de revisión de 400 líneas.

## Riesgos y mitigaciones

- Acoplamiento excesivo a Prisma: mitigar usando `Promise<T>` en interfaces y tipos Prisma sólo para shape de entidades/resultados.
- RED no observable con `yarn test` solamente: mitigar agregando `typecheck` y ejecutándolo como parte de validación; `verify:ci` puede incluirlo tras confirmar verde.
- Mocks de Vitest: no cambiar nombres de exports ni forma del objeto repository.
- Types generados de Prisma desactualizados: si `yarn typecheck` falla por cliente no generado, ejecutar flujo existente `yarn prisma:generate` antes de validar en CI/local.

## Rollout y rollback

- Rollout en un único cambio pequeño, sin migraciones ni variables de entorno nuevas.
- Rollback: revertir cambios en repositories, test de contrato, `package.json` y README opcional; validar con `yarn test`.
