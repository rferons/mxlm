# Implementation Tasks for GA Maintenance LogbookLM

1. **Repo Bootstrap & CI Pipeline**
   - Goal: Initialize a pnpm workspace for TypeScript services/front-end, a Poetry workspace for Python Lambdas, shared tooling config, and a GitHub Actions CI that runs lint + unit tests for both stacks.
   - Deliverables: `package.json`, `pnpm-workspace.yaml`, `pyproject.toml`, baseline folders (`apps/`, `services/`, `infrastructure/`, `python/`), lint/test configs, `.github/workflows/ci.yml` running `pnpm lint`, `pnpm test`, and `poetry run pytest`.
   - Verification: `pnpm run verify` aggregates lint + TS tests + `poetry run pytest`; CI must pass on default branch.

2. **Infrastructure Baseline (AWS CDK)**
   - Goal: Create TypeScript CDK app defining core serverless resources (S3 buckets with SSE-KMS, Aurora Serverless v2 cluster, Step Functions state machine stub, SQS queues, base IAM roles) and synth automation.
   - Deliverables: `infrastructure/cdk` project with stacks per bounded context, environment config, and assertion tests using `@aws-cdk/assertions`.
   - Verification: `pnpm --filter infrastructure test` executes CDK assertion suite and `pnpm --filter infrastructure cdk synth` succeeds locally.

3. **Database Schema & Migration Tooling**
   - Goal: Model the canonical Postgres schema aligned with the PRD entity checklist (organizations, users, aircraft, components, events, directives, embeddings, audit) and provide repeatable migrations.
   - Deliverables: `packages/db` with Prisma (or Kysely + drizzle) schema, generated SQL migrations, seed fixtures, and JSON schema exports for LLM grounding.
   - Verification: `pnpm --filter db test` runs schema validation + migration dry-run against ephemeral Postgres (docker-compose or testcontainer) and `pnpm --filter db generate` succeeds.
   - Status: ✅ Completed — Prisma schema modularized into reusable enum/model files with compose script, plus migrations, seeds, JSON schemas, and Vitest/Testcontainers coverage added in `packages/db`.

4. **Shared Domain Contracts**
   - Goal: Publish TypeScript and Python packages defining JSON schemas/TypeBox/Pydantic models for maintenance events, directives, compliance snapshots, and ingestion payloads.
   - Deliverables: `packages/domain-ts`, `python/domain` with generated JSON Schema artifacts in `schemas/` synced via build step.
   - Verification: `pnpm --filter domain-ts test` and `poetry run pytest python/domain/tests` validate schema parity and round-trip serialization.

5. **Auth & Multi-Tenancy Foundation**
   - Goal: Integrate Cognito user pools + hosted UI, implement Lambda authorizer verifying JWTs, and enforce `org_id` scoping utilities.
   - Deliverables: `services/auth` Lambda, infrastructure wiring, tenancy middleware shared by API Lambdas, and unit tests with `aws-sdk-client-mock`.
   - Verification: `pnpm --filter auth test` covers token validation paths; add contract tests ensuring API Gateway authorizer policy output.

6. **Direct-to-S3 Upload Service**
   - Goal: Provide REST endpoints to request multipart upload credentials, enforce 1 GB limit, and emit ingest kickoff events.
   - Deliverables: `services/upload` Lambda handlers, presigned URL helper lib, and integration tests using `localstack` or mocked S3 client.
   - Verification: `pnpm --filter upload test` runs jest/vitest suite ensuring limits, KMS enforcement, and EventBridge emission.

7. **Ingestion Orchestrator (Step Functions)**
   - Goal: Define Step Functions Express workflow for preprocess → OCR → layout → extraction → dedupe → review → persist → vectorization → compliance trigger.
   - Deliverables: State machine ASL in `services/ingestion/state-machine.asl.json`, Lambda task definitions, and simulation tests.
   - Verification: `pnpm --filter ingestion test` uses `asl-validator` and Step Functions local simulation with mocked Lambda responses.

8. **OCR & Layout Service (Python Lambda Container)**
   - Goal: Package Python Lambda (container image) wrapping Donut/TrOCR with Tesseract fallback, normalizing output to shared schema.
   - Deliverables: `python/ocr_service` with inference code, Dockerfile, model loading strategy, and golden fixtures.
   - Verification: `poetry run pytest python/ocr_service/tests` runs OCR against sample scans and checks JSON output.

9. **Extraction & Normalization Pipeline**
   - Goal: Transform OCR output into structured maintenance events with heuristics/templates and surface review flags.
   - Deliverables: `python/extraction` module, feature rules, and fixtures mapping to DB schema.
   - Verification: `poetry run pytest python/extraction/tests` asserts correct field extraction, confidence scoring, and review tagging.

10. **Event Persistence & Audit Trail**
   - Goal: Implement Lambda to persist normalized events, manage version history, attach source refs, and emit domain events for downstream systems.
   - Deliverables: `services/persistence` with transactional writes via Prisma/Kysely, audit logging, and DLQ handling.
   - Verification: `pnpm --filter persistence test` uses testcontainers Postgres to validate transactional guarantees and audit log entries.

11. **Manual Event Entry API**
   - Goal: REST endpoints for manual maintenance events, leveraging shared validations and triggering compliance recalculations.
   - Deliverables: `services/manual-events` with create/update flows, input validation, and integration with persistence + compliance queue.
   - Verification: `pnpm --filter manual-events test` covers validation, tenancy enforcement, and queue emission.

12. **FAA AD Data Importer**
   - Goal: Scheduled ingestion of FAA AD datasets with hashing, diff detection, and normalization into directives tables.
   - Deliverables: `services/ad-importer` (Python or TS) job, S3 raw storage policy, and regression fixtures from FAA sample data.
   - Verification: `poetry run pytest python/ad_importer/tests` ensures diffing logic and directive mapping; include snapshot tests.

13. **Compliance Engine**
   - Goal: Engine computing next-due inspections, AD status, and predictive projections based on events + directives.
   - Deliverables: `services/compliance` module, rule definitions, caching strategy, and generated compliance snapshots.
   - Verification: `pnpm --filter compliance test` runs deterministic rule tests with fixture aircraft logs.

14. **Vectorization & Search Index**
   - Goal: Generate embeddings for events/pages, store in pgvector, and expose retrieval helpers for hybrid search.
   - Deliverables: `services/vector-store` with embedding adapters, ingestion batcher, and SQL migration updates.
   - Verification: `pnpm --filter vector-store test` mocks embedding providers and asserts ANN queries via pgvector test container.

15. **LLM Provider Gateway**
   - Goal: Implement adapter pattern for OpenAI, Anthropic, Gemini, Grok, and OSS endpoints with routing heuristics and guardrails.
   - Deliverables: `services/llm-gateway`, provider-specific clients, safety checks, and config-driven routing.
   - Verification: `pnpm --filter llm-gateway test` uses mocked HTTP clients to cover routing + safety enforcement.

16. **RAG Q&A API with Citations**
   - Goal: Expose `/v1/query` endpoint that orchestrates retrieval, calls LLM gateway, assembles grounded answers with page-level citations and insufficient-evidence fallback.
   - Deliverables: `services/query` Lambda, prompt templates, citation formatter, and evaluation harness.
   - Verification: `pnpm --filter query test` includes unit tests using canned embeddings plus semantic assertions via LLM mock; run regression evals with `pnpm --filter query test:eval`.

17. **Next.js Frontend & Chat UX**
   - Goal: Build owner / mechanic dashboards (uploads, compliance summary, manual entry) and NotebookLM-style chat UI consuming query API.
   - Deliverables: `apps/web` Next.js app with authenticated routes, design system seeds, and Storybook stories.
   - Verification: `pnpm --filter web test` runs component/unit tests (Vitest/Testing Library) and `pnpm --filter web storybook:test` for visual snapshots.

18. **Export Service (PDF & Data Packs)**
   - Goal: Lambda generating PDF summaries and CSV/JSON exports with provenance links.
   - Deliverables: `services/export` (Python) using WeasyPrint/docxtemplater wrappers, template assets, and S3 delivery pipeline.
   - Verification: `poetry run pytest python/export/tests` renders fixture exports and checks citation integrity.

19. **Sharing & Permissions Service**
   - Goal: Implement share tokens/ACL endpoints, enforcing role-based access and audit trails.
   - Deliverables: `services/sharing` with role policies, invite workflows, and integration with Cognito groups.
   - Verification: `pnpm --filter sharing test` covers permission matrices and audit logging.

20. **Observability & Cost Guardrails**
   - Goal: Configure structured logging, metrics (OCR confidence, ingest latency, token spend), alarms, and QuickSight/Athena feeds.
   - Deliverables: Logging middleware, Powertools instrumentation, CloudWatch dashboard IaC, and cost anomaly alerts.
   - Verification: `pnpm --filter observability test` runs snapshot tests over metrics emission and validates IaC with assertions.

21. **End-to-End Test Harness & Eval Benchmarks**
   - Goal: Compose end-to-end workflow tests (upload → ingest → compliance → query) and LLM evaluation scripts using golden aircraft datasets.
   - Deliverables: `tests/e2e` with orchestrated integration tests (probably via `pytest` + `moto/localstack`), golden datasets, and evaluation reports.
   - Verification: `poetry run pytest tests/e2e -m "smoke"` must pass; include CI job gating merges on these tests.

