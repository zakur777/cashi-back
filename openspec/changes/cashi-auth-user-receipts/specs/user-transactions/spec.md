# User Transactions Specification

## Purpose

Make Cashi transactions private per authenticated user while preserving expected CRUD and balance behavior.

## Requirements

### Requirement: Transaction Ownership Model

The system MUST associate every transaction with exactly one authenticated user and support optional transaction metadata fields `receiptUrl`, `latitude`, and `longitude`.

#### Scenario: Transaction includes owner and metadata

- GIVEN a transaction is persisted
- WHEN it is created or updated
- THEN it SHALL be associated with a user owner
- AND it MAY include `receiptUrl`, `latitude`, and `longitude` when valid values are provided.

### Requirement: List User Transactions

`GET /transactions` MUST return only transactions owned by the authenticated user.

#### Scenario: List excludes other users transactions

- GIVEN user A and user B each have transactions
- WHEN user A calls `GET /transactions`
- THEN the response SHALL include user A transactions
- AND it SHALL NOT include user B transactions.

### Requirement: Get Transaction Detail

`GET /transactions/:id` MUST return an owned transaction detail to the authenticated user and MUST NOT expose another user's transaction.

#### Scenario: Own transaction detail is returned

- GIVEN an authenticated user owns a transaction
- WHEN the user calls `GET /transactions/:id` for that transaction
- THEN the system SHALL return the transaction detail.

#### Scenario: Missing transaction detail returns 404

- GIVEN no transaction exists for an id
- WHEN an authenticated user calls `GET /transactions/:id`
- THEN the system SHALL return `404 Not Found`.

#### Scenario: Other user transaction detail is forbidden

- GIVEN a transaction exists but belongs to another user
- WHEN an authenticated user calls `GET /transactions/:id` for that transaction
- THEN the system SHALL return `403 Forbidden`.

### Requirement: Create User Transaction

`POST /transactions` MUST create a transaction for the authenticated user, deriving `userId` from the token rather than trusting request body ownership fields.

#### Scenario: Create assigns authenticated user

- GIVEN an authenticated user and a valid transaction payload
- WHEN the user calls `POST /transactions`
- THEN the created transaction SHALL belong to the authenticated user.

#### Scenario: Body userId cannot override owner

- GIVEN an authenticated user sends a transaction payload containing a `userId`
- WHEN the system creates the transaction
- THEN the system SHALL NOT use the body `userId` to determine ownership.

#### Scenario: Create accepts optional receipt and coordinates

- GIVEN a valid transaction payload with `receiptUrl`, `latitude`, or `longitude`
- WHEN the user calls `POST /transactions`
- THEN the system SHALL persist the valid optional metadata with the transaction.

### Requirement: Update User Transaction

`PATCH /transactions/:id` MUST update only transactions owned by the authenticated user and MUST allow valid updates to `receiptUrl`, `latitude`, and `longitude`.

#### Scenario: Owner updates transaction

- GIVEN an authenticated user owns a transaction
- WHEN the user sends a valid `PATCH /transactions/:id` request
- THEN the system SHALL update the transaction and return the updated resource.

#### Scenario: Missing update target returns 404

- GIVEN no transaction exists for an id
- WHEN an authenticated user sends `PATCH /transactions/:id`
- THEN the system SHALL return `404 Not Found`.

#### Scenario: Non-owner update returns 403

- GIVEN a transaction exists but belongs to another user
- WHEN an authenticated user sends `PATCH /transactions/:id`
- THEN the system SHALL return `403 Forbidden`
- AND it SHALL NOT update the transaction.

### Requirement: Delete User Transaction

`DELETE /transactions/:id` MUST delete only transactions owned by the authenticated user.

#### Scenario: Owner deletes transaction

- GIVEN an authenticated user owns a transaction
- WHEN the user sends `DELETE /transactions/:id`
- THEN the system SHALL delete the transaction.

#### Scenario: Missing delete target returns 404

- GIVEN no transaction exists for an id
- WHEN an authenticated user sends `DELETE /transactions/:id`
- THEN the system SHALL return `404 Not Found`.

#### Scenario: Non-owner delete returns 403

- GIVEN a transaction exists but belongs to another user
- WHEN an authenticated user sends `DELETE /transactions/:id`
- THEN the system SHALL return `403 Forbidden`
- AND it SHALL NOT delete the transaction.

### Requirement: User Balance

`GET /transactions/balance` MUST calculate income, expense, and balance using only transactions owned by the authenticated user.

#### Scenario: Balance excludes other users data

- GIVEN user A and user B each have income and expense transactions
- WHEN user A calls `GET /transactions/balance`
- THEN totals and balance SHALL be calculated only from user A transactions.

### Requirement: Controller Ownership Check

The system MUST perform transaction ownership authorization in the controller layer before update or delete operations that mutate an existing transaction.

#### Scenario: Controller distinguishes missing and foreign resources

- GIVEN an authenticated request to update or delete a transaction id
- WHEN the controller checks the existing transaction
- THEN it SHALL return `404` if the transaction does not exist
- AND it SHALL return `403` if the transaction exists but belongs to another user.
