# Repository Contracts Specification

## Purpose

Define explicit TypeScript contracts for the repository layer so the N-Layer architecture remains visible, type-checkable, and behaviorally unchanged.

## Requirements

### Requirement: Exported Repository Contract Interfaces

The system MUST expose explicit TypeScript interfaces for the category and transaction repositories, named `CategoriesRepository` and `TransactionsRepository`, as public contracts for the repository layer.

#### Scenario: Repository contracts are importable

- GIVEN the repository modules are consumed by controllers, tests, or future maintainers
- WHEN TypeScript imports the repository contract types
- THEN `CategoriesRepository` and `TransactionsRepository` MUST be available as exported TypeScript interfaces
- AND importing those interfaces MUST NOT require runtime-only code changes.

### Requirement: Categories Repository Contract

The `CategoriesRepository` interface MUST describe the complete categories repository contract used by the application: list all categories, find a category by id, create a category, update a category, and remove a category.

#### Scenario: Category operations remain contractually complete

- GIVEN the categories controller depends on the categories repository
- WHEN the repository object is checked against `CategoriesRepository`
- THEN the contract MUST include `findAll`, `findById`, `create`, `update`, and `remove`
- AND each operation MUST preserve the existing accepted inputs and returned results.

#### Scenario: Category input schemas remain authoritative

- GIVEN category create and update payloads are validated by existing schemas
- WHEN the categories repository contract defines create and update inputs
- THEN it SHOULD use the existing category input types derived from the schemas
- AND it MUST NOT introduce a different payload shape from the existing API behavior.

### Requirement: Transactions Repository Contract

The `TransactionsRepository` interface MUST describe the complete transactions repository contract used by the application: list all transactions with category data, find a transaction by id with category data, create a transaction, update a transaction, remove a transaction, and list balance calculation inputs.

#### Scenario: Transaction operations remain contractually complete

- GIVEN the transactions controller depends on the transactions repository
- WHEN the repository object is checked against `TransactionsRepository`
- THEN the contract MUST include `findAll`, `findById`, `create`, `update`, `remove`, and `findAllForBalance`
- AND each operation MUST preserve the existing accepted inputs and returned results.

#### Scenario: Balance data contract stays repository-only

- GIVEN `GET /transactions/balance` calculates totals in the controller
- WHEN the transactions repository provides data for the balance calculation
- THEN the repository contract MUST expose only the transaction fields needed by the existing balance logic
- AND the repository contract MUST NOT move balance calculation responsibility into the repository layer.

### Requirement: Repository Objects Are Explicitly Typed

The exported repository objects MUST be explicitly typed against their corresponding interfaces while preserving their existing object-literal, non-class style.

#### Scenario: Categories repository object satisfies its contract

- GIVEN the categories repository implementation is exported
- WHEN TypeScript checks the repository module
- THEN `categoriesRepository` MUST be typed as `CategoriesRepository`
- AND missing, renamed, or incompatible category repository operations MUST fail type checking.

#### Scenario: Transactions repository object satisfies its contract

- GIVEN the transactions repository implementation is exported
- WHEN TypeScript checks the repository module
- THEN `transactionsRepository` MUST be typed as `TransactionsRepository`
- AND missing, renamed, or incompatible transaction repository operations MUST fail type checking.

### Requirement: Behavior and API Preservation

The change MUST NOT alter runtime behavior, HTTP API contracts, persistence behavior, endpoint status codes, response serialization, validation rules, or the N-Layer responsibility boundaries.

#### Scenario: Existing HTTP behavior is unchanged

- GIVEN the existing category and transaction HTTP tests
- WHEN the repository contracts are added and repository objects are explicitly typed
- THEN all existing tests MUST continue to pass with `yarn test`
- AND controller mocks that replace repository objects MUST continue to work without changing public repository export names.

#### Scenario: No database or schema behavior changes

- GIVEN the existing Prisma schema and data model
- WHEN repository contracts are introduced
- THEN no database schema, migration, relation, or persistence behavior MUST change.

### Requirement: Typecheck Validation Script

The implementation MUST add a `typecheck` script to `package.json` when implementing this change, and the script MUST run TypeScript validation without emitting compiled output.

#### Scenario: Typecheck command passes

- GIVEN implementation has added explicit repository interfaces and typed repository objects
- WHEN `yarn typecheck` is executed
- THEN the command MUST pass
- AND it MUST validate TypeScript types without writing build artifacts.

#### Scenario: Regression and type validation both pass

- GIVEN the implementation is complete
- WHEN validation is performed
- THEN `yarn test` MUST pass
- AND `yarn typecheck` MUST pass before the change is considered accepted.
