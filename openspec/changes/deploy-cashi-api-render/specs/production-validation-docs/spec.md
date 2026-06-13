# Production Validation and Documentation Specification

## Purpose

Define production validation and repository documentation required for the public Cashi API deployment.

## Requirements

### Requirement: Bruno Production Validation

The Bruno collection MUST support validating production through a configurable `baseUrl` without hard-coded deployment URLs or committed secrets.

#### Scenario: Production environment targets Render URL

- GIVEN a tester selects the Bruno Production environment
- WHEN `baseUrl` is set to the Render API URL
- THEN existing requests SHALL target `{{baseUrl}}`
- AND `/health` SHALL validate the deployed service

#### Scenario: Secret tokens remain local

- GIVEN authenticated production requests are executed
- WHEN tokens or test credentials are entered
- THEN they MUST remain in local/user-managed Bruno variables
- AND they MUST NOT be committed to the repository

### Requirement: Production API Validation Flow

The repository SHOULD document a repeatable Bruno validation flow covering health, authentication, and representative domain requests against production.

#### Scenario: Smoke validation succeeds

- GIVEN the deployed API URL and non-secret test data are available
- WHEN the documented Bruno production flow is executed
- THEN health, login/register, and representative category/transaction requests SHALL succeed or document expected validation constraints

#### Scenario: Production baseUrl changes

- GIVEN Render assigns or changes the public URL
- WHEN the Bruno Production environment is updated
- THEN requests SHALL work without editing individual request files

### Requirement: Repository Secret Hygiene

`.gitignore` MUST exclude local environment files, generated outputs, dependency folders, and local Bruno secret material while keeping shareable collection files tracked.

#### Scenario: Local secrets are ignored

- GIVEN developers create local env files or private Bruno variables
- WHEN git status is inspected
- THEN secret-bearing local files SHALL be ignored
- AND shareable Bruno request definitions SHALL remain trackable

### Requirement: README Deployment Documentation

The README MUST describe the production deployment process, public API URL placeholder or final URL, Render/PostgreSQL setup expectations, migration strategy, Bruno validation, and AI usage declaration.

#### Scenario: Production URL is documented

- GIVEN the Render service exists
- WHEN the README is reviewed
- THEN it SHALL include the public API URL or a clearly marked placeholder and replacement process
- AND it SHALL identify `/health` as the smoke-check endpoint

#### Scenario: AI usage declaration is preserved

- GIVEN repository documentation is updated for deployment
- WHEN the README is reviewed
- THEN the AI usage declaration SHALL remain present and accurate

### Requirement: Auto-Deploy Evidence Documentation

Repository documentation MUST state how reviewers can verify GitHub-connected Render auto-deploys for the deployment commit.

#### Scenario: Reviewer verifies deployed commit

- GIVEN a reviewer has the GitHub commit and Render dashboard access
- WHEN they follow the documented verification steps
- THEN they SHALL be able to confirm deploy status, branch, and commit SHA for the public API
