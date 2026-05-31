# Tasks: add-repository-contract-interfaces

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~50-100 líneas |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

## Implementation Tasks

- [x] 1. RED/typecheck setup en `package.json`
  - Agregar script `"typecheck": "tsc --noEmit"`.
  - Crear `tests/repositories/repository-contracts.types.test.ts` que importe `type { CategoriesRepository }` desde `src/repositories/categories.repository.js`, `type { TransactionsRepository }` desde `src/repositories/transactions.repository.js`, y los objetos `categoriesRepository` / `transactionsRepository`.
  - En el test, usar asignaciones type-only o `expectTypeOf` para verificar que ambos objetos satisfacen sus interfaces, sin lógica runtime relevante.
  - Verificación RED esperada: ejecutar `yarn typecheck` y confirmar que falla por interfaces aún no exportadas; ejecutar `yarn test` si se desea observar el mismo fallo por import inexistente.

- [x] 2. GREEN: agregar contrato de categorías en `src/repositories/categories.repository.ts`
  - Importar `type { Category }` desde `@prisma/client` si se usa para retornos.
  - Exportar `interface CategoriesRepository` con `findAll`, `findById`, `create`, `update` y `remove`.
  - Reutilizar `CreateCategoryInput` y `UpdateCategoryInput` para inputs.
  - Tipar `export const categoriesRepository: CategoriesRepository = { ... }` sin cambiar queries Prisma, nombres de métodos ni exports.
  - Verificar con `yarn typecheck` hasta que el contrato de categorías compile.

- [x] 3. GREEN: agregar contrato de transacciones en `src/repositories/transactions.repository.ts`
  - Importar tipos Prisma necesarios desde `@prisma/client`.
  - Definir tipos locales para transacción con categoría y datos de balance, por ejemplo con `Prisma.TransactionGetPayload`.
  - Exportar `interface TransactionsRepository` con `findAll`, `findById`, `create`, `update`, `remove` y `findAllForBalance`.
  - Reutilizar `CreateTransactionInput` y `UpdateTransactionInput` para inputs.
  - Tipar `export const transactionsRepository: TransactionsRepository = { ... }` sin cambiar `transactionInclude`, `orderBy`, `include`, `select`, serialización ni responsabilidades del controller.
  - Verificar con `yarn typecheck`.

- [x] 4. TRIANGULATE: completar prueba de contrato en `tests/repositories/repository-contracts.types.test.ts`
  - Confirmar que la prueba cubre importabilidad de `CategoriesRepository` y `TransactionsRepository` como tipos públicos.
  - Confirmar que un cambio incompatible o un método faltante en los objetos repository fallaría en `yarn typecheck`.
  - Mantener el test pequeño y sin dependencia de DB/Prisma runtime.
  - Ejecutar `yarn typecheck` y `yarn test`.

- [x] 5. Integrar typecheck en CI local en `package.json`
  - Si `yarn typecheck` y `yarn test` están verdes, actualizar `verify:ci` a `yarn verify:bootstrap && yarn verify:docs && yarn typecheck && yarn test`.
  - Ejecutar `yarn verify:ci` después del cambio.
  - Si `verify:ci` falla por causa no relacionada a typecheck, documentar el bloqueo antes de aceptar la actualización.

- [x] 6. Documentación opcional en `README.md`
  - Si aporta a la evaluación, actualizar la sección Arquitectura para indicar que `src/repositories` accede a Prisma/DB y expone contratos TypeScript explícitos.
  - No documentar endpoints nuevos ni cambios de comportamiento.

- [x] 7. REFACTOR/validación final
  - Revisar que no se introdujo `any`, clases, capa service, cambios HTTP, cambios Prisma schema, migraciones ni nuevos endpoints.
  - Ejecutar comandos finales obligatorios:
    - `yarn typecheck`
    - `yarn test`
    - `yarn verify:ci` si `verify:ci` fue actualizado.
  - Revisar diff esperado: `package.json`, `src/repositories/categories.repository.ts`, `src/repositories/transactions.repository.ts`, `tests/repositories/repository-contracts.types.test.ts`, y opcionalmente `README.md`.

## Rollback

- Revertir cambios en `package.json`, ambos archivos de `src/repositories/`, `tests/repositories/repository-contracts.types.test.ts` y `README.md` si fue editado.
- Validar rollback con `yarn test`.
