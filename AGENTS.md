# AGENTS.md

Context for AI coding agents (GitHub Copilot's coding agent, Claude Code, etc.) working in this repo.

## Overview

`dnd-interactive-maps` is a full-stack app for browsing interactive D&D campaign maps: Django backend + React/Vite frontend + PostgreSQL, all run via Docker Compose.

This file is currently **frontend-first** — the frontend is where active feature work is happening (landing page, navigation). Backend detail below is a brief pointer, not full documentation.

## Dev environment

Everything runs via Docker Compose:

```bash
docker-compose up
```

- `db` — Postgres 14, port 5432
- `backend` — Django, port 8000, bind-mounts `./backend:/app`
- `frontend` — Vite dev server, port 3000, bind-mounts `./frontend:/app`

Two intentional quirks in `docker-compose.yml` — don't "fix" these:
- `frontend` has an **anonymous volume on `/app/node_modules`**. This keeps the container's own `node_modules` from being clobbered by the host bind mount. Removing it will break the frontend container.
- `frontend` sets `CHOKIDAR_USEPOLLING=true` so Vite's file watcher picks up changes inside Docker (native FS events don't reliably cross the bind mount on all hosts).

For frontend-only work, `npm run dev` inside the `frontend` container (or locally with the deps installed) is equivalent to visiting `localhost:3000`.

## Frontend (`frontend/`)

- **React 19**, **TypeScript** (`tsc` runs as part of `build` — type errors fail the build), **Vite 7**.
- **Routing**: `react-router` v8 (the package is `react-router`, not `react-router-dom` — this repo migrated off `react-router-dom`; don't reintroduce it).
- **Data layer**: **Apollo Client** + **GraphQL**. The backend is a GraphQL API (graphene-django), not REST. New data fetching should go through Apollo queries/mutations, not `fetch`/`axios`.
- **Styling**: plain CSS (`App.css`, `index.css`). No Tailwind, no CSS-in-JS — don't introduce either without asking.
- **Testing**: Vitest + `@testing-library/react` + jsdom. Test files are colocated with source (e.g. `App.test.tsx`); global setup is in `src/setupTests.ts`.

Commands (run these yourself — do not have an agent execute build/test commands automatically unless the task explicitly requires it):

```bash
npm run dev            # start Vite dev server
npm run build           # tsc && vite build — type errors block this
npm run preview         # preview a production build
npm run test             # vitest, watch mode
npm run test:ui          # vitest with UI
npm run test:coverage    # vitest run --coverage
```

## Backend (`backend/`) — brief pointer

- Single Django app: `backend/mapdata/` (models, views, admin, management commands).
- GraphQL schema: `backend/backend/schema.py` (graphene-django). **If you change this schema, call it out explicitly in the PR description** — the frontend's Apollo queries/mutations depend on its shape.
- Tests: `backend/mapdata/tests.py`, run via `coverage run manage.py test`.
- Django migrations are generated with `manage.py makemigrations` — don't hand-edit migration files.

## CI (`.github/workflows/`)

These already run on PRs — know what to expect rather than duplicating the work:

- `unit-tests.yml` — backend (`coverage run manage.py test`) + frontend (`npm run test:coverage`); report-only, doesn't gate merge on coverage %.
- `e2e-tests.yml` — Selenium/pytest end-to-end tests (`e2e/`) against live dev servers.
- `code-quality.yml` — TruffleHog secret scan + Bandit security scan; findings auto-file a GitHub issue.
- `map-locations-agent.yml` — scheduled agent job comparing map image labels against DB pin data.
- `deploy.yml` — pushes to `main` trigger a live EC2 deploy via SSH.

## Guardrails

- **Always open a PR.** Never push directly to `main`.
- **Don't modify `.github/workflows/deploy.yml`, `.github/scripts/`, or anything deploy/EC2-related** without explicit human review — these affect a live production deployment.
- **Never commit secrets or credentials.** The repo scans every PR for them (TruffleHog), but don't rely on that as the only check.
- **Don't hand-edit Django migrations** — regenerate via `makemigrations`.
- **Flag GraphQL schema changes** in the PR description so frontend/backend contract drift is visible to reviewers.
