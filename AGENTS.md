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

## Authentication

- **`api`** is the authority: it stores users (`app_user`, BCrypt) and issues a **JWT** via the built-in `POST /login` (micronaut-security, `authentication: bearer`). All endpoints are authenticated by default; only `POST /login`, `POST /api/auth/register` and `GET /api/stats` are anonymous. The JWT carries the user's single role as a `ROLE_*` authority.
- **`web`** uses **session** authentication (micronaut-security-session). `ApiAuthenticationProvider` validates credentials against the API's `/login` and stores the JWT in the session; `ApiTokenFilter` (HTTP client filter) re-sends it as `Authorization: Bearer` on every API call.
- Public web routes: `/` (landing), `/login`, `/register`. Everything else requires a session. `/questions*` requires ADMIN or CREATOR; `/admin/**` requires ADMIN.

## Roles and permissions

Each user has exactly one role (`app_user.role`, enum `UserRole`):

- **ADMIN** — everything, plus user management: assigns roles and the question banks each user can access.
- **CREATOR** — creates/edits/deletes questions and plays free mode in any bank.
- **USER** — only plays free mode, and only in the banks assigned by an admin (none by default).

A "question bank" is an `exam_type`. Access for `USER` lives in `user_exam_type_access (user_id, exam_type_id)`; ADMIN/CREATOR implicitly access all banks. Self-registration always creates a `USER`.

Notes:
- Roles travel in the JWT: a role change applies when the user logs in again. Bank access is checked against the DB on every request (immediate).
- `GET /api/questions*` is restricted to ADMIN/CREATOR because `QuestionResponse` exposes each option's `isCorrect`.

## API endpoints (`api`, port 18080)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/login` | anonymous | Built-in micronaut-security login → JWT |
| POST | `/api/auth/register` | anonymous | Create user (always role USER) |
| GET | `/api/stats` | anonymous | `DashboardStatsResponse` (all question counters) |
| GET | `/api/stats/banks` | authenticated | Same, limited to the user's allowed banks (all for ADMIN/CREATOR) |
| GET | `/api/stats/quiz` | authenticated | `QuizStatsResponse` (current user + global) |
| GET | `/api/exam-types` | authenticated | Exam types; for USER only the assigned banks |
| GET | `/api/questions` | ADMIN/CREATOR | List questions |
| GET | `/api/questions/categories` | ADMIN/CREATOR | Distinct categories |
| GET | `/api/questions/{id}` | ADMIN/CREATOR | Single question |
| GET | `/api/questions/filter{?examType}` | ADMIN/CREATOR | Filter by exam type |
| POST | `/api/questions` | ADMIN/CREATOR | Create (validates exactly one correct option) |
| PUT | `/api/questions/{id}` | ADMIN/CREATOR | Update |
| DELETE | `/api/questions/{id}` | ADMIN/CREATOR | Delete |
| POST | `/api/free-sessions` | authenticated | Start a free-mode session (USER limited to assigned banks) |
| GET | `/api/free-sessions/{id}` | authenticated | Session detail |
| POST | `/api/free-sessions/{id}/answers` | authenticated | Answer one item |
| GET | `/api/mock-exams` | authenticated | Mock exams visible to the user (filtered by banks) |
| GET | `/api/mock-exams/{id}` | authenticated | Mock exam detail (no correct answers) |
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

Errors are mapped by `GlobalExceptionHandler` (`api/exception`): `NoSuchElementException` → 404, `IllegalArgumentException` → 400, `ForbiddenException` → 403, anything else → 500 (JSON `{"error": ...}`).

## Web routes (`web`, port 8081)

| Method | Path | View | Notes |
|--------|------|------|-------|
| GET | `/` | `index` | Landing; the bank section only shows the user's allowed banks (hidden when anonymous) |
| GET/POST | `/login`, `/register` | `login`, `register` | Public |
| POST | `/logout` | — | Ends the session |
| GET | `/questions` | `question/list` | Question bank (ADMIN/CREATOR) |
| GET | `/questions/{id}` | `question/detail` | ADMIN/CREATOR |
| GET/POST | `/questions/create` | `question/create` | ADMIN/CREATOR |
| GET/POST | `/questions/{id}/edit` | `question/create` | ADMIN/CREATOR |
| POST | `/questions/{id}/delete` | — | ADMIN/CREATOR |
| GET/POST | `/free` | `free/config` | Configure a free-mode session (any authenticated) |
| GET | `/free/{id}` | `free/question` | |
| POST | `/free/{id}/answer` | — | |
| GET | `/free/{id}/result` | `free/result` | |
| GET | `/simulacros` | `simulacro/list` | Mock exams visible to the user |
| GET | `/simulacros/{id}` | `simulacro/detail` | Detail + attempt history |
| GET/POST | `/simulacros/new` | `simulacro/form` | Create a mock exam (ADMIN/CREATOR) |
| GET/POST | `/simulacros/{id}/edit` | `simulacro/form` | Edit a mock exam (ADMIN/CREATOR) |
| POST | `/simulacros/{id}/delete` | — | Delete a mock exam (ADMIN/CREATOR) |
| POST | `/simulacros/{id}/start` | — | Start a new attempt |
| GET | `/simulacros/{id}/attempts/{attemptId}` | `simulacro/attempt` | Answer one question at a time |
| POST | `/simulacros/{id}/attempts/{attemptId}/answer` | — | Save an answer |
| POST | `/simulacros/{id}/attempts/{attemptId}/finish` | — | Submit the attempt |
| GET | `/simulacros/{id}/attempts/{attemptId}/result` | `simulacro/result` | Result + review |
| GET | `/admin/users` | `admin/users` | User/role/bank management (ADMIN) |
| POST | `/admin/users/{id}/role` | — | Change role (ADMIN) |
| POST | `/admin/users/{id}/banks` | — | Replace assigned banks (ADMIN) |

Thymeleaf views live in `web/src/main/resources/templates/` (non-default location, configured via `micronaut.views.folder: templates`).

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
  └─ question (id, text, category, exam_type_id, created_at, updated_at)
       └─ answer_option (id, question_id, letter, text, is_correct)

app_user (id, username, password_hash, display_name, role, created_at)
  ├─ user_exam_type_access (user_id, exam_type_id)   # bancos asignados al USER
  └─ free_session (id, user_id, exam_type_id, category, requested_count, created_at, finished_at)
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
                             category, selected_letter, correct_letter, is_correct, answered_at)
       └─ mock_exam_attempt_item_option (id, item_id, letter, text, is_correct)
```

A **simulacro** (mock exam) is a curated, ordered collection of questions from a single `exam_type`, created by ADMIN/CREATOR. Any user with access to that bank can take it unlimited times. Each attempt stores a **full snapshot** (question text, options and correct letter) so editing or deleting a question never changes past results; `mock_exam_attempt_item.question_id` becomes `NULL` if the question is deleted. Deleting a mock exam cascades to its attempts, and a question that belongs to a mock exam cannot be deleted (`400`).

`answer_option` has a `UNIQUE(question_id, letter)` constraint — each letter A/B/C/D appears at most once per question.

`session_item` stores the answer as a **snapshot** (`selected_letter` + `is_correct`), so editing a question later does not change past statistics. Deleting a question removes its `session_item` rows (`ON DELETE CASCADE`).

## Free mode (modo libre)

- Start a session (`POST /api/free-sessions`): filter by exam type + category + count, questions picked at random. A `USER` can only pick among its assigned banks (and gets a 403 if it has none); ADMIN/CREATOR use every bank.
- Answer one at a time (`POST /api/free-sessions/{id}/answers`); the API records correctness immediately and marks the session finished when all items are answered.
- The API never reveals the correct option of unanswered items (only `correctLetter` of answered ones).
- Statistics: `GET /api/stats` (public counters), `GET /api/stats/banks` (counters for the user's allowed banks) and `GET /api/stats/quiz` (current user's results plus an app-wide summary). The dashboard (`HomeWebController`) uses `banks` + `quiz` when logged in.
- In the web app the flow is `/free` (configure) → `/free/{id}` (answer) → `/free/{id}/result`.

## Mock exams (simulacros)

- A mock exam is a **fixed, ordered** collection of questions from a single `exam_type`, created by ADMIN/CREATOR (`/simulacros/new`). Any authenticated user with access to that bank can take it, unlimited times.
- The creation form (`templates/simulacro/form.html`) filters questions client-side by bank, by **category chips** (multi-select, with counts and a "Sin categoría" bucket) and by **text search over the question statement** (case- and accent-insensitive). Selection order is kept in the `#orderedIds` hidden inputs (`questionIds`). The toolbar can add N random questions from the current filter, select all currently visible ones, or clear the selection, all capped at 200 questions.
- Attempts are **exam-style**: no feedback while answering. The user answers question by question with a position navigator, can change answers and save progress, and only sees the correct answers after submitting.
- Access rules: `USER` only sees mock exams of its assigned banks (403 if it has none); ADMIN/CREATOR see all. An attempt is only visible to its owner.
- Statistics: `GET /api/stats/mock-exams` returns the user's attempt count, average and best score plus a per-mock-exam breakdown; the dashboard (`HomeWebController`) shows them under "Tus simulacros".
- In the web app the flow is `/simulacros` (list) → `/simulacros/{id}` (detail + history) → `/simulacros/{id}/attempts/{attemptId}` (answer) → `/simulacros/{id}/attempts/{attemptId}/result`.
- Deleting a question that belongs to a mock exam is rejected (`400`); remove it from the mock exam first.

## HTTP Client

Web module uses Micronaut's declarative `@Client` interface (`QuestionApiClient`) — no REST template boilerplate. It covers the whole API surface (auth, questions, stats, exam types, free sessions, mock exams). If migrating to a different client, keep the interface contract matching the API's endpoints.

## Build

- `mvn compile` builds all modules.
- `mvn mn:run -pl <module>` runs a module with the Micronaut Maven plugin.
- No tests yet — add under `src/test/java` in each module following Micronaut conventions.

## Running from IDE

Each module has its own `Application.main()`. Run them as separate processes:
1. Start `api` module (port 18080)
2. Start `web` module (port 8081)
3. Open http://localhost:8081/ (landing, public)
