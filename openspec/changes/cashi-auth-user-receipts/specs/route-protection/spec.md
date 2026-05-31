# Route Protection Specification

## Purpose

Ensure all non-auth Cashi API routes are protected by centralized authentication while keeping shared reference data global.

## Requirements

### Requirement: Centralized Auth Middleware

The system MUST enforce JWT authentication through a separate centralized middleware function, not duplicated inline in individual route handlers.

#### Scenario: Missing token is rejected

- GIVEN a request to a protected route without an `Authorization` header
- WHEN the request is processed
- THEN the system SHALL return `401 Unauthorized`.

#### Scenario: Invalid bearer token is rejected

- GIVEN a request to a protected route with a malformed, invalid, or expired bearer token
- WHEN the request is processed
- THEN the system SHALL return `401 Unauthorized`.

#### Scenario: Valid bearer token is accepted

- GIVEN a request to a protected route with a valid `Authorization: Bearer {token}` header
- WHEN the request is processed
- THEN the system SHALL make the authenticated user identifier available to downstream handlers.

### Requirement: Public Auth Routes

The system MUST keep only `POST /auth/register` and `POST /auth/login` public.

#### Scenario: Register and login do not require prior token

- GIVEN a client without a token
- WHEN the client calls `POST /auth/register` or `POST /auth/login`
- THEN the request SHALL reach the auth controller without a prior authentication requirement.

### Requirement: Protected Global Categories

The system MUST require authentication for category routes while keeping categories global and shared across authenticated users.

#### Scenario: Unauthenticated category access is rejected

- GIVEN a request to a category endpoint without a valid token
- WHEN the request is processed
- THEN the system SHALL return `401 Unauthorized`.

#### Scenario: Authenticated users see shared categories

- GIVEN two authenticated users
- WHEN either user calls category endpoints
- THEN the system SHALL operate on the shared category collection
- AND it SHALL NOT filter categories by user ownership.

### Requirement: N-Layer Route Protection Boundary

The system MUST preserve the N-Layer flow `routes -> controllers -> repositories -> schemas`, with authentication as cross-cutting middleware before protected controllers.

#### Scenario: Protected request follows layered flow

- GIVEN an authenticated request to categories or transactions
- WHEN the request passes middleware validation
- THEN route handlers SHALL delegate business behavior to controllers
- AND controllers SHALL use repositories and schemas rather than direct ad-hoc route logic.
