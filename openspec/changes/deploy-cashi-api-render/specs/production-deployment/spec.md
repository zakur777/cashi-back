# Production Deployment Specification

## Purpose

Define the public Render deployment contract for the Cashi API.

## Requirements

### Requirement: Render Blueprint Configuration

The repository MUST include a Render Blueprint that declares the API Web Service and managed PostgreSQL database without committing secret values.

#### Scenario: Blueprint declares deployable resources

- GIVEN the repository is connected to Render
- WHEN the Blueprint is applied
- THEN Render SHALL provision one API Web Service and one managed PostgreSQL database
- AND the service SHALL reference required env var keys without plaintext secrets

#### Scenario: Secrets remain platform-managed

- GIVEN deployment configuration is committed
- WHEN the repository is inspected
- THEN R2 credentials, JWT secrets, and database passwords MUST NOT appear in tracked files

### Requirement: Production Build and Start Compatibility

The API MUST define production-compatible install, build, and start behavior for Render using compiled output rather than TypeScript source execution.

#### Scenario: Render starts compiled API

- GIVEN Render has installed dependencies and built the project
- WHEN the Web Service starts
- THEN it SHALL run the compiled Node entry point successfully
- AND `/health` SHALL return a successful response

#### Scenario: Build output path changes

- GIVEN the compiler output path differs from the expected entry
- WHEN deployment is configured
- THEN the start command MUST be updated to match the verified build artifact

### Requirement: Managed PostgreSQL and DATABASE_URL

The production API MUST use Render-managed PostgreSQL through `DATABASE_URL` supplied by the platform.

#### Scenario: Production database connection succeeds

- GIVEN Render injects `DATABASE_URL` for the managed database
- WHEN the API starts in production
- THEN Prisma SHALL connect using that value
- AND no local database URL SHALL be required in committed files

#### Scenario: DATABASE_URL missing

- GIVEN `DATABASE_URL` is not configured in Render
- WHEN the service starts
- THEN startup or health validation MUST fail clearly enough to block promotion

### Requirement: Production Migrations

Production deployment MUST run committed Prisma migrations using `prisma migrate deploy` before accepting traffic, or document a safe one-off fallback if Render pre-deploy execution is unavailable.

#### Scenario: Migrations run during deploy

- GIVEN unapplied migrations exist
- WHEN Render deploys the service
- THEN `prisma migrate deploy` SHALL apply committed migrations before production validation

#### Scenario: Migration fails

- GIVEN a migration fails against production
- WHEN deployment validation runs
- THEN the deploy MUST be treated as failed and rollback/manual recovery instructions SHALL be followed

### Requirement: Production Object Storage Configuration

Cloudflare R2 configuration MUST be provided through Render environment variables and MUST NOT be committed.

#### Scenario: R2 env vars configured in platform

- GIVEN receipt upload validation is required
- WHEN the production service runs on Render
- THEN required R2 env vars SHALL be available from Render environment settings
- AND tracked files SHALL only document variable names and setup process

### Requirement: GitHub-Connected Automatic Deployment

The Render service MUST deploy automatically from the connected GitHub repository and expose evidence of the latest deployed commit.

#### Scenario: Push triggers deploy

- GIVEN auto-deploy is enabled for the selected branch
- WHEN a deployment commit is pushed to GitHub
- THEN Render SHALL start a deployment for that commit
- AND the README or deployment notes SHALL describe where to verify deploy status and commit SHA
