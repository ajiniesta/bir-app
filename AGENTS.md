# AGENTS.md — bir-app

Multi-module Maven project (Micronaut 4.7, Java 21) — Q&A platform for BIR/MIR/EIR exams.

## Modules

| Module | Purpose | Port |
|--------|---------|------|
| `api` | Micronaut REST backend — JPA entities, repositories, services, REST controllers | 18080 |
| `web` | Micronaut frontend — Thymeleaf views, calls `api` via HTTP client | 8081 |
| `db-migrations` | Liquibase changelogs only (not a runnable app) | — |

## Quick start

```bash
docker compose up -d                    # start PostgreSQL
mvn liquibase:update -pl db-migrations -Dliquibase.contexts=seed   # apply migrations + seed

mvn compile                              # full build

# Run each app separately (requires DB running):
mvn mn:run -pl api                       # API on :18080
mvn mn:run -pl web                       # Web on :8081
```

Open http://localhost:8081/ — landing page. Demo user: **demo / demo1234** (created by the `seed` context).

## Authentication

- **`api`** is the authority: it stores users (`app_user`, BCrypt) and issues a **JWT** via the built-in `POST /login` (micronaut-security, `authentication: bearer`). All endpoints are authenticated by default; only `POST /login`, `POST /api/auth/register` and `GET /api/stats` are anonymous.
- **`web`** uses **session** authentication (micronaut-security-session). `ApiAuthenticationProvider` validates credentials against the API's `/login` and stores the JWT in the session; `ApiTokenFilter` (HTTP client filter) re-sends it as `Authorization: Bearer` on every API call.
- Public web routes: `/` (landing), `/login`, `/register`. Everything else requires a session.

## Key conventions

- **One correct answer per question** — validated in `QuestionService` (create/update reject != 1 correct option).
- **DB schema managed exclusively via Liquibase** (`db-migrations/`). `hbm2ddl.auto=none`; never let JPA create tables.
- **API and web are separate Micronaut apps** — web never connects to the DB directly, it calls `api` via `QuestionApiClient` (Micronaut Declarative HTTP Client).
- **api base URL** configured in `web/src/main/resources/application.yml` via `api.base-url` property.
- **exam_type seed data** uses Liquibase context `seed` — run with `mvn liquibase:update -pl db-migrations -Dliquibase.contexts=seed`.

## Entity model

```
exam_type (id, code, name)
  └─ question (id, text, category, exam_type_id, created_at, updated_at)
       └─ answer_option (id, question_id, letter, text, is_correct)

app_user (id, username, password_hash, display_name, created_at)
  └─ free_session (id, user_id, exam_type_id, category, requested_count, created_at, finished_at)
       └─ session_item (id, session_id, question_id, position, selected_letter, is_correct, answered_at)
```

`answer_option` has a `UNIQUE(question_id, letter)` constraint — each letter A/B/C/D appears at most once per question.

`session_item` stores the answer as a **snapshot** (`selected_letter` + `is_correct`), so editing a question later does not change past statistics. Deleting a question removes its `session_item` rows (`ON DELETE CASCADE`).

## Free mode (modo libre)

- Start a session (`POST /api/free-sessions`): filter by exam type + category + count, questions picked at random.
- Answer one at a time (`POST /api/free-sessions/{id}/answers`); the API records correctness immediately and marks the session finished when all items are answered.
- The API never reveals the correct option of unanswered items (only `correctLetter` of answered ones).
- Statistics (`GET /api/stats/quiz`) return the current user's results plus an app-wide summary, shown on the web dashboard (`HomeWebController`).

## HTTP Client

Web module uses Micronaut's declarative `@Client` interface (`QuestionApiClient`) — no REST template boilerplate. If migrating to a different client, keep the interface contract matching the API's endpoints.

## Build

- `mvn compile` builds all modules.
- `mvn mn:run -pl <module>` runs a module with the Micronaut Maven plugin.
- No tests yet — add under `src/test/java` in each module following Micronaut conventions.

## Running from IDE

Each module has its own `Application.main()`. Run them as separate processes:
1. Start `api` module (port 18080)
2. Start `web` module (port 8081)
3. Open http://localhost:8081/questions
