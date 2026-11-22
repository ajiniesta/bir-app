# AGENTS.md — bir-app

Multi-module project (Micronaut 4.7.4 / Java 21 REST backend + Next.js 16 App Router frontend) — Q&A platform for BIR/MIR/EIR and related residency exams. Seeded exam types (`exam_type`): **MIR, EIR, BIR, FIR, PIR, QIR, RFIR**.

---

## ⚠️ Deprecation Notice: Legacy `web` Module (Micronaut + Thymeleaf)

- **`web-nextjs/` (Next.js 16 App Router, port `3000`) is the primary and official frontend** of BirApp. All frontend development and new features (such as user profile, password change, dark/light theme toggle, etc.) take place exclusively in `web-nextjs/`.
- **`web/` (Micronaut + Thymeleaf, port `8081`) is OBSOLETE (deprecated).** It is frozen in read-only maintenance mode and **no new features or functional updates will be implemented in it**. Do not add new views, endpoints, or UI features to `web/`.

---

## 🤖 AI Software Factory (Antigravity TDD Workflow)

This repository completed an architectural migration from a Server-Side Rendered frontend (`web/`, Micronaut + Thymeleaf, now obsolete) to a Headless architecture (`api/` Micronaut REST API + `web-nextjs/` Next.js App Router frontend).

All new development follows a **Strict Test-Driven Development (TDD)** pipeline orchestrated by AI agents.

### Agent Roles & Constraints

1. **🏛️ [Agent 1] Arquitecto de Contratos (analyst)**
   * **Model:** `gemini-4-argon` (or `gemini-1.5-pro`)
   * **Role:** Analyzes requirements, existing views, and Micronaut controllers.
   * **Task:** Defines the strict JSON contract (OpenAPI) the backend must output and the React component hierarchy required.
   * **Constraint:** NO implementation code. Outputs ONLY Markdown specifications.

2. **🧪 [Agent 2] Ingeniero TDD / SDET (tester)**
   * **Model:** `gemini-4-argon` (or `gemini-1.5-pro`)
   * **Role:** Relentless automation engineer (Red Phase).
   * **Task:** Translates the Architect's contract into failing tests: `Jest / React Testing Library` for Next.js (`web-nextjs/__tests__/`) and `JUnit 5/@MicronautTest` for the Java API (`api/src/test/`).
   * **Constraint:** STRICTLY FORBIDDEN to write implementation code. Outputs ONLY test files (`.test.tsx` / `.test.ts` and `*Test.java`).

3. **⚛️ [Agent 3] Desarrollador Frontend Next.js (frontend_dev)**
   * **Model:** `gemini-4-argon` (or `gemini-1.5-pro`)
   * **Role:** React/Next.js/Tailwind expert (Green Phase).
   * **Task:** Writes the exact Next.js code in `web-nextjs/` required to make the Tester's frontend tests pass.
   * **Constraint:** Cannot invent features not covered by the tests. Default to Server Components unless interactivity requires `"use client"`.

4. **☕ [Agent 4] Desarrollador Backend Micronaut (backend_dev)**
   * **Model:** `gemini-4-argon`
   * **Role:** Java backend developer (Green Phase).
   * **Task:** Implements/updates REST controllers and services in `api/` returning `@Produces(MediaType.APPLICATION_JSON)` to pass the Tester's API tests.
   * **Constraint:** Must not break the underlying service/repository layers.

5. **🕵️ [Agent 5] Integrador y Revisor (reviewer)**
   * **Model:** `gemini-4-argon` (or `gemini-1.5-pro`)
   * **Role:** Tech Lead (Refactor Phase).
   * **Task:** Ingests all generated code and tests. Validates adherence to the original contract. Refactors messy code while ensuring tests remain green. Issues the final `MERGE_READY` verdict.

### Execution Pipeline (The Golden Rule)
No developer agent (3 or 4) is allowed to generate functional code without receiving a **failing test** first. The sequence is strictly: **Analyst -> Tester -> Frontend/Backend Devs -> Reviewer**.

### 📂 Arquitectura de Carpetas
- **Backend Activo:** `api/` (Micronaut REST, puerto `18080`). Expone la API JSON y gestiona la persistencia JPA.
- **Frontend Activo:** `web-nextjs/` (Next.js 16 App Router, puerto `3000`). Todo el código nuevo de interfaz de usuario y sus tests se desarrollan aquí.
- **Frontend Legacy (OBSOLETO / Solo lectura):** `web/` (Micronaut + Thymeleaf, puerto `8081`). **No se actualizarán nuevas funcionalidades dentro de este módulo.** Se mantiene únicamente como referencia histórica y sin evolución funcional.
- **Prompts de Migración:** `migration-prompts.md` en la raíz documenta el historial de iteraciones e instrucciones por fase.

---

## Modules

| Module | Status | Purpose | Port |
|--------|--------|---------|------|
| `api` | **Active** | Micronaut REST backend — JPA entities, repositories, services, REST controllers | `18080` |
| `web-nextjs` | **Active** | Official Next.js 16 App Router frontend (standalone npm project, proxies to `api`) | `3000` |
| `db-migrations` | **Active** | Liquibase changelogs only (not a runnable app) | — |
| `web` | **Obsolete** | Legacy Micronaut + Thymeleaf frontend (frozen; no new features will be added) | `8081` |

## Quick start

```bash
docker compose up -d                    # start PostgreSQL (host port 5434 → 5432)
mvn liquibase:update -pl db-migrations -Dliquibase.contexts=seed   # apply migrations + seed

mvn compile                              # Maven build

# 1. Start the REST API (requires DB running):
mvn mn:run -pl api                       # API on :18080

# 2. Start the Next.js frontend (in a separate terminal):
cd web-nextjs && npm install && npm run dev   # Next.js on :3000
```

Open **http://localhost:3000/** (Next.js frontend). Seeded users (context `seed`):
**admin / admin1234** (ADMIN), **demo / demo1234** (CREATOR).

> *(Legacy / Obsolete)* The frozen Thymeleaf app can still be launched with `mvn mn:run -pl web` on http://localhost:8081/, but it does not receive new features.

The Postgres container exposes host port **5434** (`5434:5432`); both `api`'s datasource and `db-migrations/liquibase.properties` point at `jdbc:postgresql://localhost:5434/bir_app`.

### Whole stack with Docker (no local Maven/Node)

There are three Compose files depending on the use case:

| File | Purpose | Frontend Host Port | Command |
|------|---------|--------------------|---------|
| `docker-compose.yml` | Only **PostgreSQL** (`5434:5432`, volume `pgdata`) for local dev | — | `docker compose up -d` |
| `docker/docker-compose.yml` | Full production stack (`postgres` + `migrations` + `api` + `web-nextjs`) using **published GHCR images** with tuned memory limits (`web` legacy is commented out) | `3000` | `docker compose -f docker/docker-compose.yml up -d` |
| `docker-compose.full.yml` | Full stack (`postgres` + `migrations` + `api` + `web-nextjs` + legacy `web`) **building images locally** from the Dockerfiles | `3000` (and legacy `8081`) | `docker compose -f docker-compose.full.yml up -d --build` |

```bash
# Run from published GHCR images (recommended, no build):
docker compose -f docker/docker-compose.yml pull
docker compose -f docker/docker-compose.yml up -d         # web-nextjs → http://localhost:3000
docker compose -f docker/docker-compose.yml down -v

# Or build & run locally:
docker compose -f docker-compose.full.yml up -d --build   # web-nextjs → http://localhost:3000
docker compose -f docker-compose.full.yml logs -f web-nextjs
docker compose -f docker-compose.full.yml down -v         # -v also drops pgdata-full
```

Both full-stack files use the project name `bir-app-full` and volume `pgdata-full` (they are alternative ways to run the full deployment, not meant to run simultaneously), so they do not clash with the dev `docker-compose.yml`. Optional overrides (via env vars or `docker/.env`): `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`. See **Docker images & CI** below.

## Authentication

- **`api`** is the authority: it stores users (`app_user`, BCrypt) and issues a **JWT** via the built-in `POST /login` (micronaut-security, `authentication: bearer`). All endpoints are authenticated by default; only `POST /login`, `POST /api/auth/register`, `GET /api/stats` and `GET /api/health` are anonymous. The JWT carries the user's single role as a `ROLE_*` authority.
- **`web-nextjs`** uses **NextAuth v5** (`next-auth` `5.0.0-beta.32`, configured in `web-nextjs/auth.ts`) with a `Credentials` provider that authenticates against `POST ${API_BASE_URL}/login` (`Accept: application/json`), extracts the backend `access_token`, its JWT `exp` claim (via `app/lib/tokenExpiration.ts`) and `ROLE_*`, and stores `accessToken`, `accessTokenExpires`, `role` and `roles` in the encrypted NextAuth JWT session cookie (`AUTH_SECRET` / `NEXTAUTH_SECRET`, `maxAge: 86400`).
  - **Automatic Logout Synchronized with API**:
    1. **NextAuth JWT & Session Callbacks (`auth.ts`)**: On every request, `callbacks.jwt` and `callbacks.session` verify `isAccessTokenExpired(token.accessTokenExpires, token.accessToken)` (decoding the API JWT `exp` claim even for legacy cookies); once expired, `jwt` returns `null`, invalidating the session and clearing the cookie instead of extending a sliding session.
    2. **Client-Side Auto-Logout Guard (`app/components/AuthSessionProvider.tsx` & `Navbar.tsx`)**: Schedules a timer (`setTimeout`) for the exact `accessTokenExpires` timestamp, re-checks expiration on window `focus`/`visibilitychange`, and intercepts client-side `fetch` responses from `/api/...` (excluding `/api/auth/...`) — automatically invoking `signOut({ redirect: false })` and redirecting to `/login` whenever the token expires or the backend API returns `401 Unauthorized`.
    3. **Server Components 401 Redirection**: If a Server Component receives `401 Unauthorized` from the backend API (e.g., after an API restart with a new `JWT_SECRET`), it redirects to `/logout` (`app/logout/page.tsx`), which clears the NextAuth session cookie on the client.
- **`web` (Obsolete)** uses `micronaut-security-session` (`ApiAuthenticationProvider` + `ApiTokenFilter`).
- Public routes: `/` (landing), `/login`, `/register`. Everything else requires an authenticated session. `/questions*` and `/revisiones*` require ADMIN or CREATOR; `/admin/**` requires ADMIN.

## Roles and permissions

Each user has exactly one role (`app_user.role`, enum `UserRole`):

- **ADMIN** — everything, plus user management: assigns roles and the question banks each user can access.
- **CREATOR** — creates/edits/deletes questions, manages mock exams, reviews proposals, and plays free mode in any bank.
- **USER** — only plays free mode and mock exams in the banks assigned by an admin (none by default).

A "question bank" is an `exam_type`. Access for `USER` lives in `user_exam_type_access (user_id, exam_type_id)`; ADMIN/CREATOR implicitly access all banks. Self-registration always creates a `USER`.

Notes:
- Roles travel in the JWT: a role change applies when the user logs in again. Bank access is checked against the DB on every request (immediate).
- `GET /api/questions*` is restricted to ADMIN/CREATOR because `QuestionResponse` exposes each option's `isCorrect`.
- **Profile & password change**: any authenticated user can change their own password via `PUT /api/profile/password` (validates current password with BCrypt, enforces minimum 6 characters and confirmation match).
- **Answer proposals**: any authenticated user can propose an alternative answer on a question they saw in their own free session / mock-exam attempt; only ADMIN/CREATOR can list, review (accept/reject) and apply proposals (see **Answer proposals & review mode**).

## API endpoints (`api`, port 18080)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/health` | anonymous | Lightweight healthcheck → `{"status": "UP"}` (`HealthResponse`) |
| POST | `/login` | anonymous | Built-in micronaut-security login → JWT |
| POST | `/api/auth/register` | anonymous | Create user (always role USER) |
| PUT | `/api/profile/password` | authenticated | Change current user's password (`ChangePasswordRequest` → `MessageResponse`) |
| GET | `/api/stats` | anonymous | `DashboardStatsResponse` (all question counters) |
| GET | `/api/stats/banks` | authenticated | Same, limited to the user's allowed banks (all for ADMIN/CREATOR) |
| GET | `/api/stats/quiz` | authenticated | `QuizStatsResponse` (current user; global block only for ADMIN/CREATOR) |
| GET | `/api/stats/overview` | authenticated | `StatsOverviewResponse` (free + mock stats by category; `global` only for ADMIN/CREATOR) |
| GET | `/api/stats/questions/{id}` | authenticated | `QuestionStatsResponse` (times answered and accuracy % for a question across the whole platform and for the authenticated user) |
| GET | `/api/exam-types` | authenticated | Exam types; for USER only the assigned banks |
| GET | `/api/questions` | ADMIN/CREATOR | List questions |
| GET | `/api/questions/page{?page,size,q,examType,category,tag}` | ADMIN/CREATOR | Paginated search (20/page by default, `size` max 100) by statement text, bank, category and tag; `__NONE__` = without category/tag |
| GET | `/api/questions/categories` | ADMIN/CREATOR | Distinct categories |
| GET | `/api/tags` | authenticated | Distinct question tags (also needed by USER for the free-mode filter) |
| GET | `/api/questions/{id}` | ADMIN/CREATOR | Single question |
| GET | `/api/questions/filter{?examType}` | ADMIN/CREATOR | Filter by exam type |
| POST | `/api/questions` | ADMIN/CREATOR | Create (validates exactly one correct option) |
| PUT | `/api/questions/{id}` | ADMIN/CREATOR | Update |
| DELETE | `/api/questions/{id}` | ADMIN/CREATOR | Delete |
| POST | `/api/questions/import` | ADMIN/CREATOR | Bulk import of **one batch** (`{content}` carries the raw text); valid questions are saved, faulty ones skipped, already-existing ones counted as `duplicates` |
| GET | `/api/questions/duplicates{?examType}` | ADMIN/CREATOR | Read-only preview of duplicate questions (same bank + statement + options) |
| POST | `/api/questions/duplicates/purge` | ADMIN/CREATOR | Delete up to `maxGroups` duplicate groups, re-pointing their history; returns `remaining` |
| POST | `/api/free-sessions` | authenticated | Start a free-mode session (USER limited to assigned banks) |
| GET | `/api/free-sessions/{id}` | authenticated | Session detail |
| POST | `/api/free-sessions/{id}/answers` | authenticated | Answer one item |
| GET | `/api/mock-exams` | authenticated | Mock exams visible to the user (filtered by banks) |
| GET | `/api/mock-exams/{id}` | authenticated | Mock exam detail: each question with its options (letter + text, **never** the correct one) |
| POST | `/api/mock-exams` | ADMIN/CREATOR | Create a mock exam |
| PUT | `/api/mock-exams/{id}` | ADMIN/CREATOR | Update a mock exam |
| DELETE | `/api/mock-exams/{id}` | ADMIN/CREATOR | Delete a mock exam and its attempts |
| POST | `/api/mock-exams/{id}/attempts` | authenticated | Start a new attempt (unlimited) |
| GET | `/api/mock-exams/{id}/attempts` | authenticated | Current user's attempt history |
| GET | `/api/mock-exam-attempts/{id}` | owner | Attempt state (correct answers hidden until finished) |
| POST | `/api/mock-exam-attempts/{id}/answers` | owner | Save/change an answer |
| POST | `/api/mock-exam-attempts/{id}/finish` | owner | Submit the attempt |
| GET | `/api/mock-exam-attempts/{id}/result` | owner | Result with correct answers revealed |
| GET | `/api/stats/mock-exams` | authenticated | Current user's mock exam statistics |
| GET | `/api/admin/users` | ADMIN | Users with role and assigned banks |
| PUT | `/api/admin/users/{id}/role` | ADMIN | Change a user's role |
| PUT | `/api/admin/users/{id}/banks` | ADMIN | Replace a user's assigned banks (by exam-type code) |
| POST | `/api/proposals` | authenticated | Create/update my proposal for a question (needs the session/attempt context) |
| GET | `/api/proposals/mine{?questionIds}` | authenticated | My proposals for those questions (UI state) |
| GET | `/api/proposals{?status,examType}` | ADMIN/CREATOR | Review inbox (`status` empty = all, oldest first) |
| GET | `/api/proposals/pending-count` | ADMIN/CREATOR | `ProposalCountResponse` (menu counter) |
| POST | `/api/proposals/{id}/review` | ADMIN/CREATOR | `{status: ACCEPTED\|REJECTED, note}`; `ACCEPTED` applies the change to the question |
| POST | `/api/proposals/{id}/apply` | ADMIN/CREATOR | Apply the change programmatically (only if `ACCEPTED`, idempotent) |

Errors are mapped by `GlobalExceptionHandler` (`api/exception`): `NoSuchElementException` → 404, `IllegalArgumentException` → 400, `ForbiddenException` → 403, anything else → 500 (JSON `{"error": ...}`).

## Next.js Frontend (`web-nextjs`, port 3000) — Primary Frontend

The official frontend lives in `web-nextjs/` as a standalone Node/npm application:

- **Stack**: Next.js `16.4.5` (App Router, Turbopack, `output: "standalone"`, `cacheComponents: true`, `partialPrefetching: true`), React `19.3.0`, TypeScript `5`, Tailwind CSS `v4` (`@tailwindcss/turbopack`), NextAuth v5 (`next-auth` `5.0.0-beta.32`).
- **Runtime API Proxy**: Uses dynamic App Router Route Handlers (`app/api/[...path]/route.ts`, `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`, `app/api/auth/[...nextauth]/route.ts`) powered by `app/api/proxyHelper.ts`. Resolves `process.env.API_BASE_URL` at **runtime** (defaulting to `http://localhost:18080`), ensuring Docker deployments with `API_BASE_URL: http://api:18080` work seamlessly without hardcoded build-time rewrites.
- **Light & Dark Theme System**: `app/layout.tsx` includes an inline anti-FOUC script and `ThemeProvider` (`app/components/ThemeProvider.tsx`) + `ThemeToggle` (`app/components/ThemeToggle.tsx`) in `Navbar`. Reads/persists `'bir-theme'` (`'light'` | `'dark'`) in `localStorage` with fallback to `prefers-color-scheme: dark`, toggling the `.dark` class on `<html>`.
- **Shared Navigation (`app/components/Navbar.tsx`)**: Sticky responsive header with desktop links, theme toggle, user profile dropdown (role badge, link to `/profile`, `LogoutButton`), and mobile drawer menu.
- **Next.js 16 Agent Rules**: `web-nextjs/AGENTS.md` is auto-generated/maintained by `next dev` and points to `web-nextjs/node_modules/next/dist/docs/` for Next.js 16 breaking changes. Do not delete that block.

### Next.js Routes (`web-nextjs/app`)

| Route | Files | Auth | Description |
|-------|-------|------|-------------|
| `/` | `app/page.tsx` | public / authenticated | Landing page with public counters (`GET /api/stats`) when anonymous; full dashboard (allowed banks, free-mode & mock-exam stats, quick links) when authenticated |
| `/login` | `app/login/page.tsx`, `LoginForm.tsx` | public | Login form authenticating via NextAuth Credentials & `/api/auth/login` |
| `/register` | `app/register/page.tsx` | public | Self-registration form (`POST /api/auth/register`, creates `USER`) |
| `/logout` | `app/logout/page.tsx` | authenticated | Signs out of the NextAuth session |
| `/profile` | `app/profile/page.tsx`, `ChangePasswordButton.tsx`, `ChangePasswordModal.tsx` | authenticated | User profile card, role badge, and modal to change password (`PUT /api/profile/password`). *(Exclusive to `web-nextjs`)* |
| `/free` | `app/free/page.tsx`, `FreeConfigForm.tsx` | authenticated | Configure and start a free-mode session (bank, category, tag, question count) |
| `/free/[id]` | `app/free/[id]/page.tsx`, `FreePlayClient.tsx`, `ProposalModal.tsx` | authenticated | Play a free-mode session one question at a time with instant correction, explanation, and answer proposal modal |
| `/free/[id]/result` | `app/free/[id]/result/page.tsx` | authenticated | Free-mode session summary, accuracy, and question-by-question review |
| `/simulacros` | `app/simulacros/page.tsx`, `MockExamListClient.tsx` | authenticated | List of mock exams visible to the user, with create/delete actions for ADMIN/CREATOR and printable PDF link |
| `/simulacros/new` | `app/simulacros/new/page.tsx`, `MockExamForm.tsx` | ADMIN/CREATOR | Create a mock exam with client-side bank/category/tag/text filtering, random N selection, up to 210 ordered questions |
| `/simulacros/[id]` | `app/simulacros/[id]/page.tsx`, `MockExamDetailClient.tsx` | authenticated | Mock exam detail, attempt history, start new attempt, and link to printable sheet |
| `/simulacros/[id]/edit` | `app/simulacros/[id]/edit/page.tsx`, `MockExamForm.tsx` | ADMIN/CREATOR | Edit an existing mock exam |
| `/simulacros/[id]/pdf` | `app/simulacros/[id]/pdf/page.tsx`, `PrintButton.tsx` | authenticated | Printable mock exam view (questions, options without correct answers, and answer sheet grid) using `@media print` (`print:` Tailwind classes) and `window.print()` |
| `/simulacros/[id]/attempts/[attemptId]` | `app/simulacros/[id]/attempts/[attemptId]/page.tsx`, `MockExamAttemptClient.tsx` | owner | Exam-style attempt: question navigator, save/change answers without feedback, finish attempt |
| `/simulacros/[id]/attempts/[attemptId]/result` | `app/simulacros/[id]/attempts/[attemptId]/result/page.tsx`, `MockExamResultClient.tsx` | owner | Attempt result with correct answers and explanations revealed, plus answer proposal modal per item |
| `/estadisticas` | `app/estadisticas/page.tsx` | authenticated | Personal statistics by category (free mode + finished mock exams); global KPIs, category breakdown and per-user table for ADMIN/CREATOR |
| `/questions` | `app/questions/page.tsx`, `QuestionsListClient.tsx` | ADMIN/CREATOR | Paginated question bank (20/page) with text search and bank/category/tag filters |
| `/questions/create` | `app/questions/create/page.tsx`, `QuestionForm.tsx` | ADMIN/CREATOR | Create a new question (validates 4 options A–D and exactly 1 correct) |
| `/questions/[id]` | `app/questions/[id]/page.tsx`, `QuestionStatsButton.tsx`, `QuestionStatsModal.tsx` | ADMIN/CREATOR | Question detail with correct option highlighted, explanation, edit/delete actions, and popup showing question statistics (platform & user answered count, accuracy %, and concentric pie charts) |
| `/questions/[id]/edit` | `app/questions/[id]/edit/page.tsx`, `QuestionForm.tsx` | ADMIN/CREATOR | Edit an existing question |
| `/questions/import` | `app/questions/import/page.tsx`, `QuestionImportClient.tsx`, `jsonSplitter.ts` | ADMIN/CREATOR | Client-side JSON splitter (`jsonSplitter.ts`, batches of 100 objects) posting batch-by-batch to `/api/questions/import` with progress bar and error report |
| `/questions/duplicates` | `app/questions/duplicates/page.tsx`, `QuestionDuplicatesClient.tsx` | ADMIN/CREATOR | Preview duplicate groups by bank and run batched purge (`/api/questions/duplicates/purge`) with progress bar |
| `/revisiones` | `app/revisiones/page.tsx`, `ReviewListClient.tsx` | ADMIN/CREATOR | Review inbox for answer proposals filtered by status and bank; accept (applies change immediately) or reject with note |
| `/admin` & `/admin/users` | `app/admin/page.tsx`, `app/admin/users/page.tsx`, `AdminUsersClient.tsx` | ADMIN | User management: change user role and assign allowed question banks (`exam_type`) |

---

## Legacy Web Routes (`web`, port 8081) — ⚠️ OBSOLETE (Frozen)

> **Warning:** The `web/` module (Micronaut + Thymeleaf) is **obsolete** and kept only for backward reference. **No new features will be added to `web/`.**

| Method | Path | View | Notes |
|--------|------|------|-------|
| GET | `/` | `index` | Landing; the bank section only shows the user's allowed banks (hidden when anonymous) |
| GET/POST | `/login`, `/register` | `login`, `register` | Public |
| POST | `/logout` | — | Ends the session |
| GET | `/questions` | `question/list` | Question bank (ADMIN/CREATOR); paginated 20/page with text search + bank/category/tag filters (`?q=&examType=&category=&tag=&page=`) |
| GET | `/questions/{id}` | `question/detail` | ADMIN/CREATOR |
| GET/POST | `/questions/create` | `question/create` | ADMIN/CREATOR |
| GET/POST | `/questions/{id}/edit` | `question/create` | ADMIN/CREATOR |
| POST | `/questions/{id}/delete` | — | ADMIN/CREATOR |
| GET/POST | `/questions/import` | `question/import` | Bulk import from a JSON file: splits it into batches kept in the session (ADMIN/CREATOR) |
| POST | `/questions/import/batch` | — | Process one batch, returns its counters as JSON (progress bar) |
| POST | `/questions/import/all` | `question/import` | No-JS fallback: process every pending batch at once |
| GET | `/questions/duplicates{?examType}` | `question/duplicates` | Duplicate cleanup: preview of the groups for a bank (ADMIN/CREATOR) |
| POST | `/questions/duplicates/purge/batch` | — | Delete one batch of duplicates, returns the counters as JSON (progress bar) |
| POST | `/questions/duplicates/purge` | `question/duplicates` | No-JS fallback: repeat the purge until nothing is left |
| GET/POST | `/free` | `free/config` | Configure a free-mode session (any authenticated) |
| GET | `/free/{id}` | `free/question` | |
| POST | `/free/{id}/answer` | — | |
| POST | `/free/{id}/proposals` | — | Propose an alternative answer from the feedback screen |
| GET | `/free/{id}/result` | `free/result` | |
| GET | `/estadisticas` | `stats/index` | Personal stats by category (free + mock); global section for ADMIN/CREATOR |
| GET | `/simulacros` | `simulacro/list` | Mock exams visible to the user |
| GET | `/simulacros/{id}` | `simulacro/detail` | Detail + attempt history |
| GET | `/simulacros/{id}/pdf` | — | Printable PDF of the whole mock exam (OpenHTMLtoPDF) |
| GET/POST | `/simulacros/new` | `simulacro/form` | Create a mock exam (ADMIN/CREATOR) |
| GET/POST | `/simulacros/{id}/edit` | `simulacro/form` | Edit a mock exam (ADMIN/CREATOR) |
| POST | `/simulacros/{id}/delete` | — | Delete a mock exam (ADMIN/CREATOR) |
| POST | `/simulacros/{id}/start` | — | Start a new attempt |
| GET | `/simulacros/{id}/attempts/{attemptId}` | `simulacro/attempt` | Answer one question at a time |
| POST | `/simulacros/{id}/attempts/{attemptId}/answer` | — | Save an answer |
| POST | `/simulacros/{id}/attempts/{attemptId}/finish` | — | Submit the attempt |
| GET | `/simulacros/{id}/attempts/{attemptId}/result` | `simulacro/result` | Result + review (propose an alternative answer per item) |
| POST | `/simulacros/{id}/attempts/{attemptId}/proposals` | — | Propose an alternative answer from the mock-exam review |
| GET | `/revisiones{?status,examType}` | `review/list` | Review inbox (ADMIN/CREATOR) |
| POST | `/revisiones/{id}/review` | — | Accept/reject a proposal with a note; **accepting applies the change** (ADMIN/CREATOR) |
| GET | `/admin/users` | `admin/users` | User/role/bank management (ADMIN) |
| POST | `/admin/users/{id}/role` | — | Change role (ADMIN) |
| POST | `/admin/users/{id}/banks` | — | Replace assigned banks (ADMIN) |

Legacy Thymeleaf views live in `web/src/main/resources/templates/` (shared layout fragment in `templates/fragments/layout.html` populated by `NavService.addTo`, declarative HTTP client in `QuestionApiClient`).

## Key conventions

- **One correct answer per question** — validated in `QuestionService` (create/update reject != 1 correct option).
- **DB schema managed exclusively via Liquibase** (`db-migrations/`). `hbm2ddl.auto=none`; never let JPA create tables.
- **Headless architecture** — `web-nextjs` (and legacy `web`) never connect to the DB directly; all data and business rules live in `api` (port `18080`).
- **exam_type seed data** uses Liquibase context `seed` — run with `mvn liquibase:update -pl db-migrations -Dliquibase.contexts=seed`.
- **50 MB upload limit** — `api` configures `micronaut.server.max-request-size: 50MB` and `micronaut.server.multipart.max-file-size: 50MB` to support large JSON question imports.
- *(Legacy `web` only)* Every form `@Post` in `web` declares `@Consumes(MediaType.APPLICATION_FORM_URLENCODED)` and `POST /login` in `web` requires `Accept: text/html` for non-browser HTTP clients.

## Entity model

```
exam_type (id, code, name)
  └─ question (id, text, category, tag, explanation, exam_type_id, created_at, updated_at)
       └─ answer_option (id, question_id, letter, text, is_correct)

app_user (id, username, password_hash, display_name, role, created_at)
  ├─ user_exam_type_access (user_id, exam_type_id)   # bancos asignados al USER
  └─ free_session (id, user_id, exam_type_id, category, tag, requested_count, created_at, finished_at)
       └─ session_item (id, session_id, question_id, position, selected_letter, is_correct, answered_at)
```

`app_user.role` is `ADMIN`, `CREATOR` or `USER` (default `USER`). `user_exam_type_access` is the many-to-many between `app_user` and `exam_type` used only for `USER` (see **Roles and permissions**).

```
mock_exam (id, title, description, exam_type_id, created_by, created_at, updated_at)
  └─ mock_exam_question (id, mock_exam_id, question_id, position)
       # colección fija y ordenada; todas las preguntas son del mismo exam_type

mock_exam_attempt (id, mock_exam_id, user_id, started_at, finished_at,
                   total_questions, answered_count, correct_count)
  └─ mock_exam_attempt_item (id, attempt_id, question_id, position, question_text,
                             category, tag, explanation, selected_letter, correct_letter,
                             is_correct, answered_at)
       └─ mock_exam_attempt_item_option (id, item_id, letter, text, is_correct)
```

A **simulacro** (mock exam) is a curated, ordered collection of questions from a single `exam_type`, created by ADMIN/CREATOR. Any user with access to that bank can take it unlimited times. Each attempt stores a **full snapshot** (question text, category, tag, explanation, options and correct letter) so editing or deleting a question never changes past results; `mock_exam_attempt_item.question_id` becomes `NULL` if the question is deleted. Deleting a mock exam cascades to its attempts, and a question that belongs to a mock exam cannot be deleted (`400`).

`answer_option` has a `UNIQUE(question_id, letter)` constraint — each letter A/B/C/D appears at most once per question.

`session_item` stores the answer as a **snapshot** (`selected_letter` + `is_correct`), so editing a question later does not change past statistics. Deleting a question removes its `session_item` rows (`ON DELETE CASCADE`).

```
answer_proposal (id, question_id, proposed_by, proposed_letter, proposed_text, comment,
                 source, source_id, position, selected_letter, status,
                 created_at, updated_at, reviewed_by, reviewed_at, reviewer_note,
                 applied_by, applied_at)
```

`answer_proposal` stores a user's request to change the correct answer of a question: optionally another existing option (`proposed_letter`) and/or an alternative text (`proposed_text`), plus a mandatory `comment` (motivo). `source`/`source_id`/`position`/`selected_letter` record the **context** (a `free_session` or a `mock_exam_attempt`). There is **at most one proposal per (`question_id`, `proposed_by`)**; re-sending while not accepted updates it and resets `status` to `PENDING`. `status` is `PENDING`/`ACCEPTED`/`REJECTED`. Deleting the question cascades to its proposals (`ON DELETE CASCADE`).

## Free mode (modo libre)

- Start a session (`POST /api/free-sessions`): filter by exam type + category + tag + count, questions picked at random. The selected tag is stored in `free_session.tag` and shown on the result page. A `USER` can only pick among its assigned banks (and gets a 403 if it has none); ADMIN/CREATOR use every bank.
- Answer one at a time (`POST /api/free-sessions/{id}/answers`); the API records correctness immediately and marks the session finished when all items are answered.
- The API never reveals the correct option of unanswered items (only `correctLetter` of answered ones), nor the **explanation** (`question.explanation`): it is sent only once the item is answered.
- Statistics: `GET /api/stats` (public counters), `GET /api/stats/banks` (counters for the user's allowed banks), `GET /api/stats/quiz` (current user's free-mode results; the app-wide summary is only filled for ADMIN/CREATOR) and `GET /api/stats/overview` (combined free + mock stats by category).
- In `web-nextjs` the flow is `/free` (configure) → `/free/[id]` (answer + immediate feedback & explanation + proposal modal) → `/free/[id]/result` (summary & review).

## Mock exams (simulacros)

- A mock exam is a **fixed, ordered** collection of questions from a single `exam_type`, created by ADMIN/CREATOR (`/simulacros/new`). Any authenticated user with access to that bank can take it, unlimited times.
- The creation/edit component (`web-nextjs/app/simulacros/MockExamForm.tsx`) filters questions client-side by bank, by **category chips** (multi-select, with counts and a "Sin categoría" bucket) and by **text search over the question statement** (case- and accent-insensitive). It also has a **tag selector** with an "Añadir todas del tag" button that appends every question of the selected tag (including a "Sin tag" bucket). The toolbar can add N random questions from the current filter, select all currently visible ones, or clear the selection, all capped at **210 questions** (200 for the exam + 10 reserve).
- Attempts are **exam-style**: no feedback while answering. The user answers question by question with a position navigator, can change answers and save progress, and only sees the correct answers **and the explanation** after submitting (`/simulacros/[id]/attempts/[attemptId]/result`).
- Access rules: `USER` only sees mock exams of its assigned banks (403 if it has none); ADMIN/CREATOR see all. An attempt is only visible to its owner.
- Statistics: `GET /api/stats/mock-exams` returns the user's attempt count, average and best score plus a per-mock-exam breakdown; the dashboard (`app/page.tsx`) shows them under "Tus simulacros".
- In `web-nextjs` the flow is `/simulacros` (list) → `/simulacros/[id]` (detail + history) → `/simulacros/[id]/attempts/[attemptId]` (answer) → `/simulacros/[id]/attempts/[attemptId]/result`.
- **Printable PDF / Sheet**: in `web-nextjs`, `/simulacros/[id]/pdf` renders a clean print-optimized view (`@media print` via Tailwind `print:` utilities) with all questions, options (never the correct answer), instructions header, and a final **answer sheet** grid, triggered via `PrintButton` (`window.print()`). *(In legacy `web`, `/simulacros/{id}/pdf` used OpenHTMLtoPDF).*
- Deleting a question that belongs to a mock exam is rejected (`400`); remove it from the mock exam first.

## Statistics by category (estadísticas por categoría)

- `GET /api/stats/overview` returns `StatsOverviewResponse` combining answered questions from **free sessions** and **finished mock-exam attempts** (open attempts do not count). Each side is keyed by its own category: the live `question.category` for free mode and the snapshot `mock_exam_attempt_item.category` for mock exams.
- `mine.byCategory` includes **every category of the user's question banks** (all banks for ADMIN/CREATOR), even with 0 answers, so the user can see what is still unpracticed. A `USER` only gets the categories of its assigned banks, plus any historical category it already answered. Questions without category are grouped in the **"Sin categoría"** bucket, always sorted last.
- Categories are merged case- and accent-insensitively with `QuestionTextNormalizer`; the first spelling found is displayed. Accuracy uses the same one-decimal rounding as the rest of the stats.
- `mine` also carries `freeSessions`, `mockAttempts` (finished), `answered`, `correct` and `accuracy`.
- The `global` block (`users` with activity, totals, `byCategory` and `byUser`) is **only calculated for ADMIN/CREATOR**; for a `USER` it is `null`. The `global` block of `GET /api/stats/quiz` is gated the same way, so a `USER` never receives other users' activity.
- In `web-nextjs`, `/estadisticas` (`app/estadisticas/page.tsx`) renders KPI cards, responsive horizontal progress bars, and the full category table (plus the global KPIs, global category breakdown, and per-user table for ADMIN/CREATOR).

## Answer proposals & review mode

- Any authenticated user can **propose an alternative answer** when a question seems wrong or contentious, from two places: the free-mode **feedback** screen (`/free/[id]` after answering) and the mock-exam **review** (`/simulacros/[id]/attempts/[attemptId]/result`). The proposal may pick a different existing option and/or write a new alternative text, plus a **mandatory motivo** (`comment`).
- The proposal records its context (`source` = `FREE_SESSION` | `MOCK_EXAM_ATTEMPT`, `source_id`, `position`, `selected_letter`). The API validates that the question really belongs to that session/attempt **owned by the caller** (a mock-exam attempt must be finished); otherwise `404`/`400`.
- One proposal per user and question: sending another updates it and resets it to `PENDING`. If it is already `ACCEPTED` the API returns `400`.
- ADMIN/CREATOR can access the **review inbox** at `/revisiones` (`web-nextjs/app/revisiones/page.tsx`), filtering by status and bank.
- Review is **one step**: **accepting** a proposal (optionally with a note) immediately applies it — the proposed option becomes the only correct one and, if there is an alternative text, that option is reworded — reusing `QuestionService.update` (so the "exactly one correct option" rule holds). **Rejecting** leaves the question untouched. The API still exposes `POST /api/proposals/{id}/apply` (only when `ACCEPTED`, idempotent) for programmatic use.
- Changing the correct answer affects the live question: free-mode pages may show a different correct letter from then on, but past statistics do not change (they are snapshotted in `session_item` / `mock_exam_attempt_item`).

## Question import (importación de preguntas)

- ADMIN/CREATOR can bulk-import questions from a local file at `/questions/import` → `POST /api/questions/import` (api, JSON `{"content": "..."}`).
- Accepted format: **several concatenated JSON objects**, a JSON **array**, or a single object. Trailing commas and a UTF-8 BOM are tolerated. Each object is parsed independently, so a syntactically broken question does not block the rest. The splitter lives in `bir.app.api.support.JsonObjectSplitter` on the backend and `web-nextjs/app/questions/import/jsonSplitter.ts` on the Next.js frontend.
- Fields: `exam_type` (numeric → exam-type **id**, e.g. `"3"`; otherwise → **code**, e.g. `"BIR"`), `text` (required), `category` (optional, ≤ 100 chars), `tag` (optional, ≤ 100 chars), `explanation` (optional), `answers` (non-empty) with `letter` (`A`–`D`, unique per question), `text` and `is_correct`.
- Validation: **exactly one** answer with `is_correct: true`; letters are normalized to uppercase; text fields are trimmed. An invalid question is **skipped and reported** (with its 1-based position) while the valid ones are imported. The response is `QuestionImportResponse(total, imported, skipped, duplicates, errors)` and is always `200`; the view lists the errors and the imported count.
- **Batched on purpose.** In `web-nextjs`, `QuestionImportClient.tsx` splits the uploaded file client-side into batches of **100 objects** using `splitJsonObjects` (`jsonSplitter.ts`) and posts one batch at a time to `/api/questions/import`, updating a live progress bar and aggregating totals (`imported`, `skipped`, `duplicates`, `errors`).
- **Duplicates are skipped, not errors.** A question whose *statement* already exists in the same bank (normalized: lowercase, accents and repeated spaces ignored) is counted in `duplicates` and not saved; the same check runs against the questions already imported in the same request. That makes re-uploading an interrupted file **resume** the import: the already-saved questions are skipped and the rest are added. Different banks may hold the same statement.
- Each valid question is created through `QuestionService.create` (same "exactly one correct option" invariant), so imported questions behave like manually created ones.

## Duplicate question cleanup (limpieza de duplicadas)

- ADMIN/CREATOR can clean duplicated questions at `/questions/duplicates` (`web-nextjs/app/questions/duplicates/page.tsx`) → `GET /api/questions/duplicates` (preview) and `POST /api/questions/duplicates/purge` (api). A bank must be selected before purging; the API accepts an empty `examType` (all banks) but the UI always sends one.
- **What counts as a duplicate**: same `exam_type`, same statement **and** same answer options. Both texts are compared through `QuestionTextNormalizer` (lowercase, accents removed, whitespace collapsed — the same helper the import uses): the statement, each option's text by letter, and which letter is correct. A single typo in an option means they are *not* duplicates by design.
- **Which one is kept**: the most complete — with `explanation` first, then the one with more options, and on a tie the oldest (`id` lower). The preview shows the reason per group.
- **History is re-pointed, not lost** (per duplicate, before deleting it): `mock_exam_question` rows move to the keeper (if that mock exam already had the keeper, the row is removed and the mock exam **positions are renumbered**); `answer_proposal` rows move to the keeper unless that user already proposed on the keeper (`UNIQUE(question_id, proposed_by)`, then the duplicate's proposal is deleted); `session_item` rows move to the keeper keeping their position and snapshot, so past free sessions and their statistics do not shrink. Attempt items keep their full snapshot (`question_id` is `ON DELETE SET NULL` in the DB).
- **Batched**: each purge call processes at most 200 groups (`QuestionDuplicatesService.DEFAULT_MAX_GROUPS`, hard cap 1000) inside a single transaction and returns `remaining`; `QuestionDuplicatesClient.tsx` loops until `remaining` is 0 while updating the progress bar.
- **There is no undo.** The preview is read-only, the purge needs an explicit confirmation checkbox, and the summary plus the API log list every group with the kept/deleted question ids. Re-running the job is safe and idempotent (a second pass finds nothing).
- Statements repeated with **different options** are not touched; the preview lists them separately ("mismo enunciado pero con opciones distintas") so they can be reviewed by hand.

## Build

- `mvn compile` builds all Maven modules (`api`, `web`, `db-migrations`).
- `mvn mn:run -pl api` runs the Micronaut REST API on `:18080`.
- `mvn test` runs the whole Java test suite; `mvn -pl api test` runs the API tests. Tests use **JUnit 5 + Mockito + AssertJ** (versions from the Micronaut platform BOM) and **never touch the development database**.
- `mvn verify` is what CI runs for the Java modules.
- For **`web-nextjs`** (run inside `web-nextjs/`):
  - `npm run dev` — starts the Next.js development server on port `3000`.
  - `npm test` — runs the Jest test suite (27 test suites).
  - `npm run build` / `npm run start` — builds and starts the production Next.js standalone bundle.
  - `npm run lint` — runs ESLint (`eslint-config-next`).

## Docker images & CI

### Images

- **`api/Dockerfile`**: Standard JVM image using `eclipse-temurin:21-jre-alpine` running `java -cp /app/classes:/app/dependency/* bir.app.api.BirAppApi`.
- **`api/Dockerfile.graalvm`**: Native Image executable compiled via Oracle GraalVM 21 (`container-registry.oracle.com/graalvm/native-image:21-ol9`, using Oracle Linux 9 + `-march=compatibility` + `objcopy --remove-section=.note.gnu.property` so the binary runs on x86-64 CPUs without AVX2 such as Intel Celeron NAS devices) running on a lightweight `debian:bookworm-slim` base image (`/app/api`). Includes `snakeyaml` at runtime so `application.yml` is parsed natively.
- **`web-nextjs/Dockerfile`**: Official frontend production image (`node:20-alpine`) using Next.js 16 standalone output (`output: "standalone"` in `next.config.ts`), running `node server.js` under an unprivileged `nextjs` user on port `3000`.
- **`web/Dockerfile`** *(Obsolete)*: Legacy Thymeleaf frontend image on `eclipse-temurin:21-jre-alpine` with `fontconfig` + `ttf-dejavu`.

The **build context for all images is the repository root**:

```bash
docker build -f api/Dockerfile -t bir-app-api:local .
docker build -f api/Dockerfile.graalvm -t bir-app-api:graalvm .
docker build -f web-nextjs/Dockerfile -t bir-app-web-nextjs:local .
docker build -f web/Dockerfile -t bir-app-web:local .          # obsolete
```

Notes:

- There is no fat-jar plugin for the JVM image, so it ships `target/classes` plus `dependency:copy-dependencies` output (`target/dependency`).
- `.dockerignore` drops `.git`, `.github`, `.idea`, `**/target`, `**/node_modules`, `**/.next`, `*.md`, `sample.json`, `docker-compose*.yml`, `oficiales/` and `to_import_sample_data/` (>200 MB of sample data; `.gitignore` also ignores `*.orig` directories).
- Configuration is env-driven: `api` reads `${DB_URL:...}` / `DB_USERNAME` / `DB_PASSWORD` / `JWT_SECRET`, and `web-nextjs` reads `${API_BASE_URL:http://localhost:18080}` and `AUTH_SECRET`.
- Published GHCR images (`ghcr.io/ajiniesta/bir-app/api:latest`, `api-graalvm:latest`, `web-nextjs:latest`, and legacy `web:latest`) can be run directly without building via `docker/docker-compose.yml` (which runs `postgres`, `migrations`, `api` and `web-nextjs` with memory limits tuned for small servers/NAS, and keeps legacy `web` commented out).

### Pipeline (`.github/workflows/ci.yml`)

| Job | When | What it does |
|-----|------|--------------|
| `build-test` | every push and PR | `mvn -B -ntp verify` (Java) + `npm ci && npm test && npm run build` (`web-nextjs`); uploads `surefire-reports` as an artifact on failure |
| `docker` (matrix: `api`, `api-graalvm`, `web`, `web-nextjs`) | pushes to `main` only | Buildx build + push to GHCR |
| `smoke` | pushes to `main` only | `docker compose -f docker-compose.full.yml up -d --build`, then asserts `GET /api/stats` contains `totalQuestions`, checks login, and verifies `web-nextjs` responds on `:3000`; dumps logs on failure and always runs `down -v` |

- Registry auth uses the built-in `GITHUB_TOKEN` (`permissions: packages: write`), no extra secrets.
- Image names: `ghcr.io/<owner>/<repo>/<module>` (`api`, `api-graalvm`, `web-nextjs`, and legacy `web`, lowercased with `${GITHUB_REPOSITORY,,}`).
- Tags per image: `main` (branch), `sha-<short>` and `latest`.
- Build cache: `type=gha` scoped per module.

## Tests

- **`api`** — unit and controller tests with JUnit 5, Mockito and AssertJ (no DB required):
  - Controller tests: `AdminControllerTest`, `AuthControllerTest`, `HealthControllerTest`, `ProfileControllerTest`.
  - Service & support tests: `AppUserServiceTest`, `QuestionServiceTest`, `MockExamServiceTest`, `FreeSessionServiceTest`, `AnswerProposalServiceTest`, `QuestionImportServiceTest`, `QuestionDuplicatesServiceTest`, `StatisticsServiceTest`, `JsonObjectSplitterTest`, `QuestionTextNormalizerTest` and `GlobalExceptionHandlerTest`. Entity fixtures live in `api/src/test/java/bir/app/api/support/TestData.java`.
- **`web-nextjs`** — 27 component, page, and API proxy test suites using **Jest 30** (`jest-environment-jsdom`, configured via `next/jest.js` in `web-nextjs/jest.config.ts` and `web-nextjs/jest.setup.ts`) and **React Testing Library** (`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`) under `web-nextjs/__tests__/`:
  - Auth & Profile: `login/page.test.tsx`, `register/page.test.tsx`, `profile/page.test.tsx`, `profile/change-password.test.tsx`.
  - Layout, Theme & Design System: `landing/page.test.tsx`, `components/Navbar.test.tsx`, `components/ThemeToggle.test.tsx`, `design-system/consistency.test.tsx`, `api/proxy.test.ts`.
  - Free Mode: `free/config.test.tsx`, `free/play.test.tsx`, `free/result.test.tsx`.
  - Mock Exams: `simulacros/list.test.tsx`, `simulacros/detail.test.tsx`, `simulacros/form.test.tsx`, `simulacros/attempt.test.tsx`, `simulacros/result.test.tsx`, `simulacros/pdf.test.tsx`.
  - Questions, Import & Duplicates: `questions/list.test.tsx`, `questions/detail.test.tsx`, `questions/create.test.tsx`, `questions/edit.test.tsx`, `questions/import.test.tsx`, `questions/duplicates.test.tsx`.
  - Reviews, Stats & Admin: `revisiones/list.test.tsx`, `estadisticas/page.test.tsx`, `admin/users/page.test.tsx`.
- **`web` (Obsolete)** — legacy unit and `@MicronautTest` controller tests under `web/src/test/`.

## Running from IDE

Run the backend and the Next.js frontend as separate processes:
1. Start `api` module (`bir.app.api.BirAppApi.main()`, port `18080`)
2. Start `web-nextjs` (`cd web-nextjs && npm run dev`, port `3000`)
3. Open **http://localhost:3000/** (Next.js frontend)
4. *(Obsolete)* Legacy `web` (`bir.app.web.BirAppWeb.main()`, port `8081`) does not need to be started for normal development.
