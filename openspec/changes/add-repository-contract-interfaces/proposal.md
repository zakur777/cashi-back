# Propuesta: add-repository-contract-interfaces

## Intento

Hacer explícitos los contratos TypeScript de la capa repository para que la arquitectura N-Layer sea visible y evaluable. Actualmente `categoriesRepository` y `transactionsRepository` existen como objetos literales funcionales, pero no exportan interfaces que documenten el contrato esperado por controllers/tests.

## Contexto

- Stack actual: TypeScript + Hono + Prisma + PostgreSQL + Zod + Vitest.
- Arquitectura documentada: `routes -> controllers -> repositories -> database`.
- Repositories actuales:
  - `src/repositories/categories.repository.ts`
  - `src/repositories/transactions.repository.ts`
- Feedback recibido: el proyecto no usa interfaces TypeScript para contratos.
- Strict TDD activo: cualquier implementación posterior debe conservar regresión con `yarn test` y, si se agrega script o test de tipos, validarlo antes de cerrar.

## Alcance

- Agregar interfaces TypeScript explícitas y exportadas para los contratos de repository.
- Tipar los objetos literales existentes contra esas interfaces sin cambiar su comportamiento.
- Mantener estilo actual funcional/sin clases.
- Documentar, si aporta a la evaluación, que los repositories exponen contratos explícitos.

## Áreas afectadas

### Código fuente

- `src/repositories/categories.repository.ts`
  - Agregar `export interface CategoriesRepository`.
  - Tipar `categoriesRepository` con ese contrato.
- `src/repositories/transactions.repository.ts`
  - Agregar `export interface TransactionsRepository`.
  - Tipar `transactionsRepository` con ese contrato.

### Documentación opcional

- `README.md`
  - Ajustar la sección de arquitectura para mencionar contratos TypeScript explícitos en repositories.

### Tests/validación

- Tests Vitest existentes para asegurar que no hay cambios funcionales.
- Validación de tipos mediante TypeScript si el proyecto tiene script disponible o agregando una validación mínima no invasiva en la fase de implementación.
- Posibles type assertions de contrato repository si el patrón de tests del proyecto lo permite.

## Fuera de alcance / non-goals

- No migrar versiones de Prisma ni Zod.
- No agregar autenticación/autorización.
- No crear endpoints nuevos ni modificar rutas existentes.
- No cambiar contratos HTTP, payloads, status codes ni serialización.
- No introducir capa service ni clases.
- No modificar schema Prisma, migraciones ni datos.

## Enfoque propuesto

1. Definir interfaces exportadas en el mismo archivo del repository para mantener el contrato cerca de su implementación.
2. Derivar tipos de retorno desde Prisma/implementación cuando convenga para evitar duplicar estructuras complejas.
3. Reutilizar tipos existentes de Zod (`CreateCategoryInput`, `UpdateCategoryInput`, `CreateTransactionInput`, `UpdateTransactionInput`) para los parámetros de entrada.
4. Asignar el objeto literal existente a su interfaz, por ejemplo conceptualmente: `export const categoriesRepository: CategoriesRepository = { ... }`.
5. Evitar `any`; usar tipos inferidos, `ReturnType`/`Awaited` o tipos Prisma si son necesarios.
6. Mantener imports ESM locales con extensión `.js`, según el estándar actual del repo.

## Plan de pruebas y validación

- Ejecutar `yarn test` para regresión de controllers/rutas con repositories mockeados.
- Ejecutar typecheck/build si existe script disponible en la fase de implementación; si no existe, considerar `yarn tsc --noEmit` como validación manual/no persistente o proponer un script separado en otro cambio.
- Si se agregan pruebas de contrato, preferir type assertions de compilación sin runtime significativo para confirmar que los objetos exportados satisfacen sus interfaces.
- Confirmar que no cambian snapshots/respuestas HTTP ni el acceso Prisma.

## Riesgos

- Tipar retornos Prisma con demasiada precisión puede acoplar el contrato a detalles internos del ORM.
- Tipar retornos con demasiada abstracción puede perder valor evaluativo para el feedback del profesor.
- El proyecto no expone actualmente un script `build` o `typecheck`; la validación de tipos puede requerir comando manual o una decisión posterior.
- Cambios en exports pueden afectar mocks de Vitest si se reestructura el módulo; la implementación debe ser incremental y conservar nombres existentes.

## Rollback

- Revertir los cambios en los archivos de repository y cualquier línea documental agregada al README.
- Como no hay cambios de DB/API, no se requieren migraciones ni rollback de datos.
- Validar rollback con `yarn test`.

## Criterios de éxito

- `CategoriesRepository` y `TransactionsRepository` existen como interfaces TypeScript exportadas.
- `categoriesRepository` y `transactionsRepository` están tipados explícitamente contra sus interfaces.
- No hay cambios de comportamiento/API ni de persistencia.
- `yarn test` sigue pasando.
- La documentación, si se modifica, comunica que la capa repository tiene contratos explícitos para la arquitectura N-Layer.
