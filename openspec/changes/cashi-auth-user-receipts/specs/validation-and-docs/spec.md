# Validation and Documentation Specification

## Purpose

Keep validation behavior compatible with Zod 4 and document the authenticated receipt workflow so the project can be configured, reviewed, and demonstrated.

## Requirements

### Requirement: Zod 4 Validation Behavior

The system MUST validate auth and transaction inputs with schemas compatible with Zod 4 and return structured validation failures for invalid client payloads.

#### Scenario: Invalid auth payload returns validation errors

- GIVEN an auth request with invalid email or password fields
- WHEN the request is validated
- THEN the system SHALL return a client validation error response
- AND it SHALL NOT execute the successful register or login behavior.

#### Scenario: Invalid transaction payload returns validation errors

- GIVEN an authenticated transaction create or update request with invalid amount, type, category, receipt URL, latitude, or longitude values
- WHEN the request is validated
- THEN the system SHALL return a client validation error response
- AND it SHALL NOT persist invalid transaction data.

#### Scenario: Optional metadata validates when present

- GIVEN `receiptUrl`, `latitude`, or `longitude` are omitted from a transaction payload
- WHEN the payload is otherwise valid
- THEN validation SHALL allow the request
- AND when those fields are present they SHALL satisfy URL and coordinate constraints.

### Requirement: Environment Documentation

The README MUST document the environment variables required to run authentication and R2 receipt uploads.

#### Scenario: Developer can identify required auth and R2 configuration

- GIVEN a developer reads the README
- WHEN they look for setup configuration
- THEN they SHALL find `JWT_SECRET`
- AND they SHALL find the required Cloudflare R2 variables: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, and `R2_PUBLIC_URL`.

### Requirement: R2 Setup Documentation

The README MUST describe that receipt uploads use Cloudflare R2 and how the public receipt URL is produced from the configured bucket/public URL.

#### Scenario: Reviewer understands storage choice

- GIVEN a reviewer reads the README
- WHEN they inspect the receipt upload documentation
- THEN they SHALL see that Cloudflare R2 is the selected storage backend
- AND they SHALL see enough setup information to configure a bucket and credentials.

### Requirement: Demonstrable Authenticated Receipt Flow

The README or delivery notes MUST describe a video-demonstrable flow covering registration, login, receipt upload, transaction creation, and balance lookup.

#### Scenario: Flow can be demonstrated end to end

- GIVEN the API is running with database and R2 configuration
- WHEN a reviewer follows the documented flow
- THEN they SHALL be able to register, login, upload a receipt, create a transaction with `receiptUrl`, and view the authenticated user's balance.

### Requirement: Architecture Documentation

The README MUST document the relevant N-Layer architecture decisions for this change, including middleware location and controller ownership checks.

#### Scenario: Reviewer can locate security boundaries

- GIVEN a reviewer reads the README
- WHEN they look for architecture notes
- THEN they SHALL understand where centralized auth middleware lives
- AND they SHALL understand that transaction ownership checks are performed in controllers rather than repositories.

### Requirement: AI Usage Disclosure

The README MUST include an AI usage disclosure if AI tools were used for this project work.

#### Scenario: AI assistance is declared

- GIVEN AI tools were used during development or documentation
- WHEN a reviewer reads the README
- THEN they SHALL find a disclosure describing which tools were used and for what purpose.
