# Receipt Upload Specification

## Purpose

Allow authenticated Cashi users to upload receipt images to Cloudflare R2 and attach the returned public URL to transactions.

## Requirements

### Requirement: Protected Receipt Upload Endpoint

The system MUST expose `POST /transactions/upload` as a protected endpoint that accepts `multipart/form-data` with a file field named `receipt`.

#### Scenario: Authenticated upload request reaches upload handling

- GIVEN an authenticated user
- WHEN the user sends `POST /transactions/upload` with `multipart/form-data` and field `receipt`
- THEN the system SHALL process the uploaded file as a receipt candidate.

#### Scenario: Upload without receipt field is rejected

- GIVEN an authenticated request without a `receipt` file field
- WHEN the user sends `POST /transactions/upload`
- THEN the system SHALL reject the request with a client error response.

#### Scenario: Unauthenticated upload is rejected

- GIVEN a request without a valid token
- WHEN the client sends `POST /transactions/upload`
- THEN the system SHALL return `401 Unauthorized`.

### Requirement: Receipt File Validation

The system MUST accept only JPEG, PNG, or WebP receipt images and MUST reject files larger than 5 MB.

#### Scenario: Valid image type and size is accepted

- GIVEN an authenticated upload with a JPEG, PNG, or WebP file no larger than 5 MB
- WHEN the user sends `POST /transactions/upload`
- THEN the system SHALL accept the file for storage.

#### Scenario: Unsupported MIME type is rejected

- GIVEN an authenticated upload with a file that is not JPEG, PNG, or WebP
- WHEN the user sends `POST /transactions/upload`
- THEN the system SHALL reject the file with a client error response
- AND it SHALL NOT store the file.

#### Scenario: Oversized file is rejected

- GIVEN an authenticated upload with a file larger than 5 MB
- WHEN the user sends `POST /transactions/upload`
- THEN the system SHALL reject the file with a client error response
- AND it SHALL NOT store the file.

### Requirement: Cloudflare R2 Receipt Storage

The system MUST store accepted receipt uploads in Cloudflare R2 and return a public URL for the stored object.

#### Scenario: Successful R2 upload returns receipt URL

- GIVEN R2 is configured and an authenticated user uploads a valid receipt image
- WHEN storage succeeds
- THEN the system SHALL return a JSON response containing `receiptUrl`
- AND `receiptUrl` SHALL be a public URL suitable for later transaction create or update requests.

#### Scenario: R2 configuration is required for receipt upload

- GIVEN the R2 environment configuration required by the application is incomplete or invalid
- WHEN a user attempts to upload a receipt
- THEN the system SHALL fail safely with a controlled error response
- AND it SHALL NOT claim the upload succeeded.

### Requirement: Receipt URL Transaction Integration

The system MUST allow the URL returned by `POST /transactions/upload` to be used as the `receiptUrl` metadata field when creating or updating transactions.

#### Scenario: Uploaded receipt URL is attached to transaction

- GIVEN a successful receipt upload returned `{ "receiptUrl": "https://..." }`
- WHEN the authenticated user creates or updates a transaction with that `receiptUrl`
- THEN the system SHALL persist the URL on that user's transaction.
