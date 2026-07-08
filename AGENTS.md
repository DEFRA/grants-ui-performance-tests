# Repository Guidelines

## Project Structure & Module Organization

k6 scenarios live in `scenarios/`, with vendored libraries in `scenarios/lib/` and test users in `scenarios/dal-users.csv`. HTML reports are generated under `reports/`. Backend data seeding tools live in `data-seeding/`.

## Build, Test, and Development Commands

- `docker build -t grants-ui-performance-tests .`: build the k6 container.
- `docker run --rm -v "$(pwd)/reports:/reports" grants-ui-performance-tests`: run with defaults locally.
- `npm --prefix data-seeding install`: install data-seeding dependencies.
- `npm --prefix data-seeding test`: run data-seeding tests when present.

## Coding Style & Naming Conventions

Keep scenario filenames named after the journey under load. Use explicit environment variable names for tunable load settings and keep vendored k6 libraries under `scenarios/lib/`.

## Domain Language

Use `CONTEXT.md` as the source of truth for grants performance testing language. Prefer those terms in scenarios, reports, docs, and generated changes.

## Developer Addenda

Developers can add their own `AGENTS.local.md` and should be read as an addendum to this file. Keep that file local to your machine and do not commit it.

## Testing Guidelines

Run short-duration local tests before longer load runs. Preserve reference-number assertions and per-page duration metrics when changing journey scripts.
