# AGENTS.md — bir-app

Multi-module Maven project (Micronaut 4.7.4, Java 21) — Q&A platform for BIR/MIR/EIR and related residency exams. Seeded exam types (`exam_type`): **MIR, EIR, BIR, FIR, PIR, QIR, RFIR**.

## Modules

| Module | Purpose | Port |
|--------|---------|------|
| `api` | Micronaut REST backend — JPA entities, repositories, services, REST controllers | 18080 |
| `web` | Micronaut frontend — Thymeleaf views, calls `api` via HTTP client | 8081 |
| `db-migrations` | Liquibase changelogs only (not a runnable app) | — |

## Quick start

```bash
docker compose up -d                    # start PostgreSQL (host port 5434 → 5432)
mvn liquibase:update -pl db-migrations -Dliquibase.contexts=seed   # apply migrations + seed

mvn compile                              # full build

# Run each app separately (requires DB running):
mvn mn:run -pl api                       # API on :18080
mvn mn:run -pl web                       # Web on :8081
```

Open http://localhost:8081/ — landing page (public). Seeded users (context `seed`):
**admin / admin1234** (ADMIN), **demo / demo1234** (CREATOR).

The Postgres container exposes host port **5434** (`5434:5432`); both `api`'s datasource and `db-migrations/liquibase.properties` point at `jdbc:postgresql://localhost:5434/bir_app`.

### Whole stack with Docker (no local Maven)

`docker-compose.full.yml` brings up **PostgreSQL + migrations + API + web** (builds the images from the Dockerfiles):

```bash
docker compose -f docker-compose.full.yml up -d --build   # web → http://localhost:8081
docker compose -f docker-compose.full.yml logs -f web
docker compose -f docker-compose.full.yml down -v         # -v also drops pgdata-full
```

It uses its own project name (`bir-app-full`) and volume (`pgdata-full`), so it does not clash with the dev `docker-compose.yml`. Optional overrides: `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`. See **Docker images & CI** below.

## Authentication

- **`api`** is the authority: it stores users (`app_user`, BCrypt) and issues a **JWT** via the built-in `POST /login` (micronaut-security, `authentication: bearer`). All endpoints are authenticated by default; only `POST /login`, `POST /api/auth/register` and `GET /api/stats` are anonymous. The JWT carries the user's single role as a `ROLE_*` authority.
- **`web`** uses **session** authentication (micronaut-security-session). `ApiAuthenticationProvider` validates credentials against the API's `/login` and stores the JWT in the session; `ApiTokenFilter` (HTTP client filter) re-sends it as `Authorization: Bearer` on every API call.
- Public web routes: `/` (landing), `/login`, `/register`. Everything else requires a session. `/questions*` and `/revisiones*` require ADMIN or CREATOR; `/admin/**` requires ADMIN.

## Roles and permissions

Each user has exactly one role (`app_user.role`, enum `UserRole`):

- **ADMIN** — everything, plus user management: assigns roles and the question banks each user can access.
- **CREATOR** — creates/edits/deletes questions and plays free mode in any bank.
- **USER** — only plays free mode, and only in the banks assigned by an admin (none by default).

A "question bank" is an `exam_type`. Access for `USER` lives in `user_exam_type_access (user_id, exam_type_id)`; ADMIN/CREATOR implicitly access all banks. Self-registration always creates a `USER`.

Notes:
- Roles travel in the JWT: a role change applies when the user logs in again. Bank access is checked against the DB on every request (immediate).
- `GET /api/questions*` is restricted to ADMIN/CREATOR because `QuestionResponse` exposes each option's `isCorrect`.
- **Answer proposals**: any authenticated user can propose an alternative answer on a question they saw in their own free session / mock-exam attempt; only ADMIN/CREATOR can list, review (accept/reject) and apply proposals (see **Answer proposals & review mode**).

## API endpoints (`api`, port 18080)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/login` | anonymous | Built-in micronaut-security login → JWT |
| POST | `/api/auth/register` | anonymous | Create user (always role USER) |
| GET | `/api/stats` | anonymous | `DashboardStatsResponse` (all question counters) |
| GET | `/api/stats/banks` | authenticated | Same, limited to the user's allowed banks (all for ADMIN/CREATOR) |
| GET | `/api/stats/quiz` | authenticated | `QuizStatsResponse` (current user; global block only for ADMIN/CREATOR) |
| GET | `/api/stats/overview` | authenticated | `StatsOverviewResponse` (free + mock stats by category; `global` only for ADMIN/CREATOR) |
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

## Web routes (`web`, port 8081)

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
| GET | `/simulacros/{id}/pdf` | — | Printable PDF of the whole mock exam (questions + options, no correct answers, with an answer sheet) |
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

Thymeleaf views live in `web/src/main/resources/templates/` (non-default location, configured via `micronaut.views.folder: templates`).

### Shared layout (mobile-first)

Every view starts with the two fragments in `templates/fragments/layout.html`:

```html
<head th:replace="~{fragments/layout :: head('Título - BirApp')}"></head>
<body class="bg-light">
<nav th:replace="~{fragments/layout :: nav}"></nav>
```

- `head(title)` carries the **`<meta name="viewport">`** (without it a phone renders at ~980 px), the Bootstrap CSS **and the JS bundle** (needed for the collapsible menu), and the inline mobile CSS. Do not add per-page `<head>` blocks; pass the title as the fragment argument (the value can be an expression).
- `nav` is the only navigation bar: a hamburger **offcanvas** below 768 px and a normal row above it (`.nav-inline` CSS). It reads `authenticated`, `isAdmin`, `isCreator`, `displayName`, `canReview` and `pendingProposals` from the model; **all of them are put there by `NavService.addTo`**, which every controller already calls. Add a new global link in the fragment, not per page.
- Login/register use only `head` (no `nav`, they are public).
- Mobile helpers in the same `<style>`: `.answer-option`/`.answer-text` (whole row tappable), `.question-text` (bigger statement), `.action-bar` (primary buttons: normal row on desktop, fixed to the bottom on mobile — add `has-action-bar` to `<body>`), `.tag-select` and `.question-nav` (collapsible question navigator in an attempt).
- Because the layout is a fragment, changing a navbar link or a media query is a one-file change; a page that forges its own `<nav>` will drift.

## Key conventions

- **One correct answer per question** — validated in `QuestionService` (create/update reject != 1 correct option).
- **DB schema managed exclusively via Liquibase** (`db-migrations/`). `hbm2ddl.auto=none`; never let JPA create tables.
- **API and web are separate Micronaut apps** — web never connects to the DB directly, it calls `api` via `QuestionApiClient` (Micronaut Declarative HTTP Client).
- **api base URL** configured in `web/src/main/resources/application.yml` via `api.base-url` property.
- **exam_type seed data** uses Liquibase context `seed` — run with `mvn liquibase:update -pl db-migrations -Dliquibase.contexts=seed`.
- **Every form `@Post` in `web` must declare `@Consumes(MediaType.APPLICATION_FORM_URLENCODED)`.** Micronaut defaults `@Post` routes to consuming `application/json`; a browser form sends `application/x-www-form-urlencoded`, so without the annotation the route does not match and the request falls through to `/login` (the security filter turns the unmatched route into a 401). `@Consumes` alone is enough — no `@Body` parameter is required if the handler ignores the body.

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
- Statistics: `GET /api/stats` (public counters), `GET /api/stats/banks` (counters for the user's allowed banks), `GET /api/stats/quiz` (current user's free-mode results; the app-wide summary is only filled for ADMIN/CREATOR) and `GET /api/stats/overview` (combined free + mock stats by category). The dashboard (`HomeWebController`) uses `banks` + `quiz` when logged in.
- In the web app the flow is `/free` (configure) → `/free/{id}` (answer) → `/free/{id}/result`. The **explanation** is shown on the feedback screen after answering (`free/question.html`) and again per question in the result (`free/result.html`).

## Mock exams (simulacros)

- A mock exam is a **fixed, ordered** collection of questions from a single `exam_type`, created by ADMIN/CREATOR (`/simulacros/new`). Any authenticated user with access to that bank can take it, unlimited times.
- The creation form (`templates/simulacro/form.html`) filters questions client-side by bank, by **category chips** (multi-select, with counts and a "Sin categoría" bucket) and by **text search over the question statement** (case- and accent-insensitive). It also has a **tag selector** with an "Añadir todas del tag" button that appends every question of the selected tag (including a "Sin tag" bucket). Selection order is kept in the `#orderedIds` hidden inputs (`questionIds`). The toolbar can add N random questions from the current filter, select all currently visible ones, or clear the selection, all capped at **210 questions** (200 for the exam + 10 reserve). The web module raises `micronaut.server.netty.form-max-fields` to 512 because the form posts one `questionIds` field per selected question (the Netty default of 128 breaks saving ~200 questions).
- Attempts are **exam-style**: no feedback while answering. The user answers question by question with a position navigator, can change answers and save progress, and only sees the correct answers **and the explanation** after submitting (`simulacro/result.html`).
- Access rules: `USER` only sees mock exams of its assigned banks (403 if it has none); ADMIN/CREATOR see all. An attempt is only visible to its owner.
- Statistics: `GET /api/stats/mock-exams` returns the user's attempt count, average and best score plus a per-mock-exam breakdown; the dashboard (`HomeWebController`) shows them under "Tus simulacros".
- In the web app the flow is `/simulacros` (list) → `/simulacros/{id}` (detail + history) → `/simulacros/{id}/attempts/{attemptId}` (answer) → `/simulacros/{id}/attempts/{attemptId}/result`.
- **Printable PDF**: each mock exam can be downloaded as a PDF from the list and the detail (`/simulacros/{id}/pdf`, `target="_blank"`). It is generated server-side by the `web` module with **OpenHTMLtoPDF** (`bir.app.web.support.MockExamPdfService`), which renders an XHTML document to `application/pdf` (`Content-Disposition: inline`). It contains every question with its options (letter + text, **never** the correct answer) and its **explanation** when present, an instructions header and a final **answer sheet** grid to mark A/B/C/D by hand. Access matches the detail page: it reuses `client.getMockExam(id)`, so `USER` only gets PDFs for its assigned banks (otherwise `404`) and anonymous requests are rejected (`401`).
- Deleting a question that belongs to a mock exam is rejected (`400`); remove it from the mock exam first.

## Statistics by category (estadísticas por categoría)

- `GET /api/stats/overview` returns `StatsOverviewResponse` combining answered questions from **free sessions** and **finished mock-exam attempts** (open attempts do not count). Each side is keyed by its own category: the live `question.category` for free mode and the snapshot `mock_exam_attempt_item.category` for mock exams.
- `mine.byCategory` includes **every category of the user's question banks** (all banks for ADMIN/CREATOR), even with 0 answers, so the user can see what is still unpracticed. A `USER` only gets the categories of its assigned banks, plus any historical category it already answered. Questions without category are grouped in the **"Sin categoría"** bucket, always sorted last.
- Categories are merged case- and accent-insensitively with `QuestionTextNormalizer`; the first spelling found is displayed. Accuracy uses the same one-decimal rounding as the rest of the stats.
- `mine` also carries `freeSessions`, `mockAttempts` (finished), `answered`, `correct` and `accuracy`.
- The `global` block (`users` with activity, totals, `byCategory` and `byUser`) is **only calculated for ADMIN/CREATOR**; for a `USER` it is `null`. The `global` block of `GET /api/stats/quiz` is gated the same way, so a `USER` never receives other users' activity.
- The web page `/estadisticas` (`templates/stats/index.html`) renders KPI cards, a horizontal **Chart.js** bar chart (CDN, pinned version) and the full category table. The chart reads the `data-*` attributes of the table rows, so the table remains the source of truth and still works without JavaScript. ADMIN/CREATOR also see the global KPIs, the global category chart and the per-user table.
- The computation loads the answered items and aggregates in memory, like the existing quiz stats. No Liquibase changes are needed.

## Answer proposals & review mode

- Any authenticated user can **propose an alternative answer** when a question seems wrong or contentious, from two places: the free-mode **feedback** screen (`/free/{id}` after answering) and the mock-exam **review** (`/simulacros/{id}/attempts/{attemptId}/result`). The proposal may pick a different existing option and/or write a new alternative text, plus a **mandatory motivo** (`comment`).
- The proposal records its context (`source` = `FREE_SESSION` | `MOCK_EXAM_ATTEMPT`, `source_id`, `position`, `selected_letter`). The API validates that the question really belongs to that session/attempt **owned by the caller** (a mock-exam attempt must be finished); otherwise `404`/`400`.
- One proposal per user and question: sending another updates it and resets it to `PENDING`. If it is already `ACCEPTED` the API returns `400`.
- ADMIN/CREATOR see a **counter of pending proposals** in the menu that is recomputed on **every page** (one extra API call per render, via `web/.../support/NavService.java`), and a **review inbox** at `/revisiones` (top-level, *not* under `/admin/**`, so CREATOR can reach it). Filter by status and bank.
- Review is **one step**: **accepting** a proposal (optionally with a note) immediately applies it — the proposed option becomes the only correct one and, if there is an alternative text, that option is reworded — reusing `QuestionService.update` (so the "exactly one correct option" rule holds). **Rejecting** leaves the question untouched. The API still exposes `POST /api/proposals/{id}/apply` (only when `ACCEPTED`, idempotent) for programmatic use.
- Changing the correct answer affects the live question: free-mode pages may show a different correct letter from then on, but past statistics do not change (they are snapshotted in `session_item` / `mock_exam_attempt_item`).
- Web views: the proposal form is inside `free/question.html` and `simulacro/result.html`; the inbox is `review/list.html`. The web form `@Post` handlers carry `@Consumes(MediaType.APPLICATION_FORM_URLENCODED)`.

## Question import (importación de preguntas)

- ADMIN/CREATOR can bulk-import questions from a local file at `/questions/import` (web) → `POST /api/questions/import` (api, JSON `{"content": "..."}`). The web reads the uploaded file as UTF-8 and forwards its text in `content`; the API does the parsing.
- Accepted format: **several concatenated JSON objects**, a JSON **array**, or a single object. Trailing commas and a UTF-8 BOM are tolerated. Each object is parsed independently, so a syntactically broken question does not block the rest. The splitter lives in `bir.app.api.support.JsonObjectSplitter` (mirrored in `bir.app.web.support`, since `web` never depends on `api`).
- Fields: `exam_type` (numeric → exam-type **id**, e.g. `"3"`; otherwise → **code**, e.g. `"BIR"`), `text` (required), `category` (optional, ≤ 100 chars), `tag` (optional, ≤ 100 chars), `explanation` (optional), `answers` (non-empty) with `letter` (`A`–`D`, unique per question), `text` and `is_correct`.
- Validation: **exactly one** answer with `is_correct: true`; letters are normalized to uppercase; text fields are trimmed. An invalid question is **skipped and reported** (with its 1-based position) while the valid ones are imported. The response is `QuestionImportResponse(total, imported, skipped, duplicates, errors)` and is always `200`; the view lists the errors and the imported count.
- **Batched on purpose.** The web never sends the whole file in one call: `QuestionWebController` splits it into batches of **100 objects** (`QuestionImportStore.BATCH_SIZE`) and keeps them in the HTTP **session** (`QuestionImportJob`). The view then posts one batch at a time to `POST /questions/import/batch`, which returns `{index, totalBatches, total, imported, skipped, duplicates, errors}` as JSON and drives the Bootstrap progress bar. Without JavaScript the page offers `POST /questions/import/all`, which walks every batch server-side and renders the aggregated summary. Sending the whole file in one request used to hit the client `read-timeout` (10 s by default) on big files: the browser got `Read Timeout` while the API kept saving questions in the background. `web` now sets `micronaut.http.client.read-timeout: 60s` as a safety net.
- **Duplicates are skipped, not errors.** A question whose *statement* already exists in the same bank (normalized: lowercase, accents and repeated spaces ignored) is counted in `duplicates` and not saved; the same check runs against the questions already imported in the same request. That makes re-uploading an interrupted file **resume** the import: the already-saved questions are skipped and the rest are added. Different banks may hold the same statement. The texts of the affected banks are loaded once per request (`QuestionRepository.findTextsByExamTypeId`), and the `exam_type` lookup is cached per raw value.
- Each valid question is created through `QuestionService.create` (same "exactly one correct option" invariant), so imported questions behave like manually created ones. The import logs progress every 100 questions (`Importación de preguntas: X de N procesadas…`). No Liquibase changes are needed.

## Duplicate question cleanup (limpieza de duplicadas)

- ADMIN/CREATOR can clean duplicated questions at `/questions/duplicates` (web) → `GET /api/questions/duplicates` (preview) and `POST /api/questions/duplicates/purge` (api). A bank must be selected before purging; the API accepts an empty `examType` (all banks) but the UI always sends one.
- **What counts as a duplicate**: same `exam_type`, same statement **and** same answer options. Both texts are compared through `QuestionTextNormalizer` (lowercase, accents removed, whitespace collapsed — the same helper the import uses): the statement, each option's text by letter, and which letter is correct. A single typo in an option means they are *not* duplicates by design.
- **Which one is kept**: the most complete — with `explanation` first, then the one with more options, and on a tie the oldest (`id` lower). The preview shows the reason per group.
- **History is re-pointed, not lost** (per duplicate, before deleting it): `mock_exam_question` rows move to the keeper (if that mock exam already had the keeper, the row is removed and the mock exam **positions are renumbered** — the attempt navigator walks with `position ± 1`, and `mock_exam_attempt_item.position` copies the mock exam's position); `answer_proposal` rows move to the keeper unless that user already proposed on the keeper (`UNIQUE(question_id, proposed_by)`, then the duplicate's proposal is deleted); `session_item` rows move to the keeper keeping their position and snapshot, so past free sessions and their statistics do not shrink. Attempt items keep their full snapshot (`question_id` is `ON DELETE SET NULL` in the DB).
- **Batched**: each purge call processes at most 200 groups (`QuestionDuplicatesService.DEFAULT_MAX_GROUPS`, hard cap 1000) inside a single transaction and returns `remaining`; the view loops until it is 0, so no request gets near the HTTP timeout. Without JavaScript, `POST /questions/duplicates/purge` repeats the call server-side (max 50 passes) and renders the aggregated summary.
- **There is no undo.** The preview is read-only, the purge needs an explicit confirmation checkbox, and the summary plus the API log list every group with the kept/question ids. Re-running the job is safe and idempotent (a second pass finds nothing).
- Statements repeated with **different options** are not touched; the preview lists them separately ("mismo enunciado pero con opciones distintas") so they can be reviewed by hand.
- Tests: `QuestionDuplicatesServiceTest` (grouping, keep selection, mock exam re-pointing and renumbering, proposal conflicts, session items, bank filter, idempotency, `remaining`), `QuestionTextNormalizerTest` and `DuplicateQuestionsWebControllerTest` (preview, batch, no-JS purge, CREATOR allowed, USER rejected).

## HTTP Client

Web module uses Micronaut's declarative `@Client` interface (`QuestionApiClient`) — no REST template boilerplate. It covers the whole API surface (auth, questions, stats, exam types, free sessions, mock exams, answer proposals). Optional query params (e.g. `listAnswerProposals(status, examType)`) must be annotated `@Nullable` or the client throws when they are `null`. If migrating to a different client, keep the interface contract matching the API's endpoints.

## Build

- `mvn compile` builds all modules.
- `mvn mn:run -pl <module>` runs a module with the Micronaut Maven plugin.
- `mvn test` runs the whole suite; `mvn -pl api test` / `mvn -pl web test` run one module. Tests use **JUnit 5 + Mockito + AssertJ** (versions from the Micronaut platform BOM) and **never touch the development database**.
- `mvn verify` is what CI runs (same tests, no extra integration phase).

## Docker images & CI

### Images

`api/Dockerfile` and `web/Dockerfile` are self-contained multi-stage builds: the build stage compiles with Maven, the runtime stage is `eclipse-temurin:21-jre-alpine` and runs `java -cp /app/classes:/app/dependency/*`. The **build context is the repository root** (the POMs are a multi-module aggregator, so all of them must be copied before `-pl <module> -am`):

```bash
docker build -f api/Dockerfile -t bir-app-api:local .
docker build -f web/Dockerfile -t bir-app-web:local .
```

Notes:

- There is no fat-jar plugin, so the image ships `target/classes` plus `dependency:copy-dependencies` output (`target/dependency`).
- The `web` runtime installs `fontconfig` + `ttf-dejavu`; without them OpenHTMLtoPDF renders PDFs with no text.
- `.dockerignore` drops `.git`, `**/target`, `oficiales/` and `to_import_sample_data/` (>200 MB of sample data).
- Configuration is env-driven: `api` reads `${DB_URL:...}` / `DB_USERNAME` / `DB_PASSWORD` / `JWT_SECRET`, `web` reads `${API_BASE_URL:http://localhost:18080}`.

### Pipeline (`.github/workflows/ci.yml`)

| Job | When | What it does |
|-----|------|--------------|
| `build-test` | every push and PR | `mvn -B -ntp verify`; uploads `surefire-reports` as an artifact on failure |
| `docker` (matrix `api`, `web`) | pushes to `main` only | Buildx build + push to GHCR |
| `smoke` | pushes to `main` only | `docker compose -f docker-compose.full.yml up -d --build`, then asserts `GET /api/stats` contains `totalQuestions` and that a real form login (`admin/admin1234`) returns `303`; dumps logs on failure and always runs `down -v` |

- Registry auth uses the built-in `GITHUB_TOKEN` (`permissions: packages: write`), no extra secrets.
- Image names: `ghcr.io/<owner>/<repo>/api` and `ghcr.io/<owner>/<repo>/web` (lowercased with `${GITHUB_REPOSITORY,,}`, which GHCR requires).
- Tags per image: `main` (branch), `sha-<short>` and `latest`.
- Build cache: `type=gha` scoped per module.

## Tests

- **`api`** — plain Mockito unit tests (no Micronaut context, no DB): `QuestionService`, `MockExamService`, `FreeSessionService`, `AnswerProposalService`, `QuestionImportService`, `QuestionDuplicatesService`, `StatisticsService`, `JsonObjectSplitter`, `QuestionTextNormalizer` and `GlobalExceptionHandler`. Entity fixtures live in `api/src/test/java/bir/app/api/support/TestData.java`.
- **`web`** — two layers:
  - Unit tests with Mockito: forms (`QuestionForm`, `MockExamForm`), `MockExamPdfService` (renders a PDF and extracts its text with PDFBox), `ApiAuthenticationProvider`, `ApiTokenFilter`, `NavService`, `JsonObjectSplitter`, `QuestionImportJob`.
  - `@MicronautTest` HTTP tests (`QuestionWebController`, `DuplicateQuestionsWebController`, `MockExamWebController`, `FreeSessionWebController`, `ReviewWebController`, `StatsWebController`) that exchange real requests against the app on a random port. `QuestionApiClient` is replaced with a Mockito mock through a `@MockBean` **method** returning the mock (field-level `@MockBean` is not populated in JUnit, only read as a bean factory). The helper `WebTestSupport` performs a real form login and reuses the `SESSION` cookie.
  - `web/src/test/resources/application-test.yml` sets `micronaut.server.port: -1` and `micronaut.http.client.follow-redirects: false` so tests assert `303` + `Location` instead of the final page.
  - Regression coverage: creating a mock exam with **210 `questionIds`** (the `form-max-fields: 512` fix) and the 211-question rejection.
- Names in English and `@DisplayName` in Spanish, like the rest of the docs.

## Running from IDE

Each module has its own `Application.main()`. Run them as separate processes:
1. Start `api` module (port 18080)
2. Start `web` module (port 8081)
3. Open http://localhost:8081/ (landing, public)
