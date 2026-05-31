# Auth Specification

## Purpose

Provide account registration and login so Cashi can identify users with JWTs while never storing plaintext passwords.

## Requirements

### Requirement: User Registration

The system MUST expose `POST /auth/register` as a public endpoint that creates a user account from a valid email and password, stores only a bcrypt password hash, and returns a signed JWT for the created user.

#### Scenario: Register with valid credentials

- GIVEN a request body with a valid email and password
- WHEN the client sends `POST /auth/register`
- THEN the system SHALL create a user with unique email
- AND the stored password field SHALL be a bcrypt hash, not the submitted plaintext password
- AND the response SHALL include a JWT representing the created user.

#### Scenario: Reject duplicate email

- GIVEN an existing user with an email
- WHEN a client registers with the same email
- THEN the system SHALL reject the request with a controlled error response
- AND it SHALL NOT create a second user with that email.

#### Scenario: Reject invalid registration payload

- GIVEN a registration payload with invalid email or invalid password
- WHEN the client sends `POST /auth/register`
- THEN the system SHALL return a validation error response
- AND it SHALL NOT create a user.

### Requirement: User Login

The system MUST expose `POST /auth/login` as a public endpoint that validates credentials against the stored bcrypt hash and returns a signed JWT only for valid credentials.

#### Scenario: Login with valid credentials

- GIVEN a registered user and the correct password
- WHEN the client sends `POST /auth/login`
- THEN the system SHALL compare the submitted password with the stored bcrypt hash
- AND the response SHALL include a JWT representing that user.

#### Scenario: Reject invalid credentials

- GIVEN an unknown email or an incorrect password
- WHEN the client sends `POST /auth/login`
- THEN the system SHALL return `401 Unauthorized`
- AND the response SHALL NOT reveal whether the email exists.

### Requirement: JWT Response Contract

Authentication endpoints MUST return tokens that protected routes can use through `Authorization: Bearer {token}`.

#### Scenario: Token can authenticate protected requests

- GIVEN a token returned by register or login
- WHEN the client sends the token in the `Authorization` header as `Bearer {token}`
- THEN protected endpoints SHALL be able to identify the authenticated user from the token.

#### Scenario: Token response excludes password data

- GIVEN a successful register or login response
- WHEN the response body is inspected
- THEN it SHALL NOT include plaintext password or password hash fields.
