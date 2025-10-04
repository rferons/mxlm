# Agent Operating Guide

All agents share this repo and must follow the same tooling, conventions, and workflows. Treat this document as your source of truth and update it when the baseline changes.

## Toolchain
- **Node.js:** Use v20.x LTS or newer (≥ 20.0). Never downgrade below 20.
- **Package manager:** `pnpm@10.18.0`. Install with Corepack (`corepack prepare pnpm@10.18.0 --activate`) before running `pnpm` commands.
- **Python:** Use CPython 3.11 with `poetry` for dependency management.
- **Poetry:** Run `poetry install --no-root` to sync Python deps; keep `poetry.lock` committed.
- **Git hooks:** If you add hooks, ensure they run inside pnpm/poetry environments and document them here.

## Repository Structure
- Client & Lambda code: `apps/`, `services/`, `packages/`, `infrastructure/`.
- Python services & libs: `python/src/mxlm`, tests under `python/tests`.
- Shared assets and schemas belong in `packages/` (TypeScript) or `python/domain` (Python) once created.
- Place end-to-end/eval suites in `tests/` at repo root.

## Commands & Automation
- Install deps: `pnpm install` (Node) and `poetry install --no-interaction --no-ansi` (Python).
- Lint: `pnpm run lint` (ESLint with TypeScript-ESLint 8 + Prettier compatibility).
- Unit tests: `pnpm run test` (Vitest 3) and `poetry run pytest`.
- Full check before merging: `pnpm run verify` (runs lint, Vitest, pytest).
- CI mirrors these commands; pipelines must stay green.
- Prisma schemas (packages/db): edit files under `packages/db/prisma/schema/**` and run `pnpm --filter db compose` to rebuild `prisma/.generated/schema.prisma` before calling Prisma CLI manually. Package scripts handle this automatically.

## TypeScript Style & Patterns
- Use ES modules, strict TypeScript (`strict: true`) with `tsconfig.json` at repo root.
- Prefer functional modules with dependency injection over singletons when possible.
- Follow ESLint config (`eslint:recommended`, `@typescript-eslint/recommended`, stylistic rules). Resolve all warnings; max warnings is zero.
- Formatting: rely on ESLint + Prettier compatibility; do not introduce alternative formatters.

## Python Style & Patterns
- Keep code under `python/src/mxlm`. Add new packages via Poetry.
- Adopt `pytest` for testing; name tests `test_*.py`.
- Follow PEP 8 + black-style spacing. If you add formatters or linters (black, ruff, mypy), document commands here and wire them into CI.

## Documentation & Specs
- Update `tasks.md` when you add or complete roadmap items.
- Keep this `AGENTS.md` aligned with actual tooling (versions, scripts, directories).
- Any architectural decisions should cross-reference `design_spec.md` and the PRD.

## Collaboration Protocol
- Never remove or overwrite teammates' work without coordination.
- Ensure new scripts/configs run in CI and are documented here.
- Prefer deterministic tests and fixtures; avoid network calls in unit tests.
- Before committing, run `pnpm run verify` and ensure Git status is clean.

## Expectation When Tooling Changes
1. Update relevant config files (`package.json`, `pyproject.toml`, CI workflow).
2. Regenerate lockfiles (`pnpm-lock.yaml`, `poetry.lock`).
3. Update this guide (section: Toolchain & Commands).
4. Notify agents via PR description so everyone keeps tooling consistent.
