# Ansible Infra CD: Project Starter

Hand-off document for the coding sessions that take over development. It covers what exists, the decisions already made, and the plan for the rest.

## 1. What this project is

An ArgoCD-style coordinator for **AAP/AWX**. It compares config-as-code repositories (written for `infra.aap_configuration`) with the live state of an AAP/AWX instance, shows what is synced and what has drifted, and lets users sync changes from repo to platform (and, later, platform to repo).

- **Overview**: dashboard of current status (health, drift counts, sync success rate, activity feed).
- **Configs**: list of repositories with sync status.
- **Repo detail**: flowchart of the config's dependency elements (organizations, credentials, projects, inventories, templates, workflows), colored by synced / drifted / missing / error.
- Users are administrators and platform users who want to visualize configuration state and sync it.

## 2. Decisions already made

| Topic | Decision |
|---|---|
| Targets | **One** AAP/AWX target for now (Red Hat supports one instance per cluster deployment). Multi-target comes later; the schema already allows it (`Repository.target` FK, no singleton constraint). The one-target limit is enforced only in the UI. |
| Target config | Entered **in the application** (Settings page) and stored in Postgres, never from env/files, so we are not locked into single-tenancy. |
| Secrets | AAP token (and later git credentials) are stored in the DB, **encrypted with Fernet** (`apps/core/fields.py`). The key is `AIC_ENCRYPTION_KEY`, the one bootstrap secret that must live outside the DB. The API never returns secrets (write-only `token`, read-only `token_set` flag). |
| Deployment config | Environment variables prefixed `AIC_` (see `.env.example`, `ansibleinfracd/settings.py`). |
| Database | PostgreSQL: authentication storage and site data. |
| Cache / broker | Redis: cache on DB 1, Celery broker on DB 0. Celery results in Postgres via `django-celery-results`. |
| Background jobs | Celery worker + beat. The web app monitors them via `GET /api/v1/system/health/` (DB, Redis, worker ping, beat heartbeat). |
| Auth | Django users + sessions (Postgres), DRF `SessionAuthentication`, API requires login by default. No SSO yet. |
| API | Django REST Framework only, under `/api/v1/`. **No drf-spectacular / OpenAPI generator**: AAP/AWX don't use it, and compatibility with their stack is a goal. |
| Frontend | React + TypeScript + Vite + **PatternFly 6**, bundled and served by Django through WhiteNoise (catch-all route returns the SPA's `index.html`). Flowchart uses `@xyflow/react`. |
| Containers | UBI 9 multi-stage `Containerfile` (Node build stage, then Python runtime, non-root). `compose.yml` for Podman Compose with web, worker, beat, db, redis. |
| Testing | **Intentionally none in the baseline.** QA agents will build effective tests in the real project phase (see roadmap). |

## 3. What exists today (the baseline)

```
ansibleinfracd/        Django project (settings, urls, celery app)
apps/core/             models, serializers, views, tasks, seed_demo command
  models.py            Target, Repository, SyncRun
  fields.py            EncryptedTextField (Fernet)
  tasks.py             heartbeat (beat), test_target_connection (ping AAP/AWX)
  views.py             SPA view, session auth, viewsets, overview, system health
frontend/              Vite + PF6 app (src/pages: Login, Overview, Configs, RepoDetail, Settings)
  src/sampleGraph.ts   PLACEHOLDER fake data for the flowchart
Containerfile, compose.yml, entrypoint.sh, Makefile, .env.example
```

Working end to end: login, overview from real API data, repo list, settings form with a working **Test connection** (Celery task pinging `/api/controller/v2/ping/` for AAP or `/api/v2/ping/` for AWX), health endpoint, encrypted token storage.

Placeholders / not implemented: the flowchart (fake sample data), actual syncing and drift detection (`Repository.sync_status` and `SyncRun` are only filled by `seed_demo`), repository add/edit UI (the API supports it), SSO, user management UI.

### Run it

```bash
make up            # generates .env on first run, builds, starts everything on :8000
make superuser     # create a login
make seed          # optional demo data
make dev-frontend  # optional: Vite dev server with hot reload on :5173 (proxies /api to :8000)
```

Notes for developers: the app is served on `http://localhost:8000`. The frontend only needs Node inside the container; nothing is required on the host. `podman-compose` is in `requirements-dev.txt`. After code changes run `podman-compose up -d --build --force-recreate web worker beat` (rebuilding the image alone does not replace running containers).

## 4. Roadmap

Rough order; each item is a good unit for a separate session.

### Phase 1: Repositories and Git access
- Repository add/edit/delete UI (API already exists at `/api/v1/repositories/`).
- Git credentials: per-repo, **encrypted in the DB** using `EncryptedTextField` (SSH key or HTTPS token), write-only in the API.
- Clone/fetch task (Celery) into a working directory volume; record `last_commit`; handle fetch errors as `sync_status=error`.

### Phase 2: Drift detection (the core)
`infra.aap_configuration` **does not implement check mode properly**, so drift is computed in Python, not with `ansible-runner --check`:
1. **Parse** the repo's config-as-code variable files into a normalized model keyed by object kind and name (organizations, teams, users, credentials, credential types, projects, inventories and sources, job templates, workflow templates, notifications, settings, etc.). Follow the collection's variable names/structure (`controller_*` / `gateway_*` vars) as the schema.
2. **Pull live state** from the controller/gateway API using the stored token (read-only GETs, paginated).
3. **Compare**: per object, classify as `synced`, `drifted` (with field-level diff), `missing` (in repo, not in platform) or `extra` (in platform, not in repo; relevant to pruning). Normalize defaults and server-added fields so they don't create false drift; ignore secret values (compare presence only).
4. Store results per repository and expose them via the API; update `Repository.sync_status` and `drift_summary`. Run on a Celery beat schedule plus on demand.
- Define a stable **graph contract** for the repo-detail page: nodes = config objects (kind, name, status, diff), edges = dependencies (organization to credentials/teams/inventories/projects; project + inventory to job templates; templates to workflows). Replace `frontend/src/sampleGraph.ts` with data from the API.

### Phase 3: Sync (repo to platform)
- "Sync" action per repository and per object: apply the repo's configuration to the platform in dependency order. Applying can use `infra.aap_configuration` via `ansible-runner` (only drift *detection* is custom), or direct API calls; decide in this phase.
- Track each run in `SyncRun` (status, summary, log output), stream/poll status to the UI. Confirmation dialog showing the diff before applying; optional prune of `extra` objects behind an explicit opt-in.
- Optional auto-sync per repository (ArgoCD style) with sync windows.

### Phase 4: Platform to repo
- Export live config (e.g. `infra.aap_configuration` export/filetransfer roles or custom API export), write it into a **new branch and open a PR/MR**; never push to the main branch directly.

### Phase 5: Platform features
- Multi-target tenancy (UI to add targets, per-target dashboards, target selector in the masthead; Variant 1 "environment cards" from the original mockup fit here).
- SSO (OIDC / AAP OAuth), role-based access (viewer / syncer / admin), audit log.
- Notifications/webhooks on drift or failed syncs; Git webhooks to trigger syncs.
- Encrypted-key rotation procedure for `AIC_ENCRYPTION_KEY`.

### Phase 6: Quality and delivery
- **QA agents build the test suite**: pytest-django (API auth/permissions, models, tasks with mocked AAP responses, drift comparison with fixture repos), frontend tests, end-to-end via Podman Compose. Dev requirements already include pytest, pytest-django, ruff, black, ansible-lint.
- Linting/formatting: ruff + black for Python, ESLint + `tsc` for the frontend.
- CI (e.g. GitHub Actions): lint, tests, image build.
- Production hardening: HTTPS/proxy settings, `AIC_DEBUG_MODE=False`, gunicorn tuning, backups for Postgres, image publishing.

## 5. Conventions and gotchas

- All settings live in `ansibleinfracd/settings.py` behind `AIC_*` env vars. With `AIC_DEBUG_MODE=False`, `AIC_ENCRYPTION_KEY` is required. In debug without one, a key is derived from `AIC_SECRET_KEY` (development only).
- Losing `AIC_ENCRYPTION_KEY` makes stored secrets unreadable (they decrypt to an empty value). Back it up.
- Vite builds with `base="/static/"`; Django serves `frontend/dist` via `STATICFILES_DIRS` + WhiteNoise. Don't hand-edit built files.
- The SPA catch-all route in `ansibleinfracd/urls.py` excludes `api/`, `admin/` and `static/`; add new non-SPA prefixes there.
- New API endpoints: add serializers/viewsets in `apps/core` (or a new app under `apps/`), register them in `apps/core/urls.py`; keep secrets write-only.
- Keep the schema multi-target-ready: always scope data through `Target`, never assume a single row in backend code.
