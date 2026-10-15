# AGENTS.md — bir-app

Multi-module Maven project (Micronaut 4.7, Java 21) — Q&A platform for BIR/MIR/EIR exams.

## Modules

| Module | Purpose | Port |
|--------|---------|------|
| `api` | Micronaut REST backend — JPA entities, repositories, services, REST controllers | 8080 |
| `web` | Micronaut frontend — Thymeleaf views, calls `api` via HTTP client | 8081 |
| `db-migrations` | Liquibase changelogs only (not a runnable app) | — |

## Quick start

```bash
docker compose up -d                    # start PostgreSQL
mvn flyway:migrate -pl db-migrations     # apply DB migrations
# or use liquibase directly:
mvn liquibase:update -pl db-migrations

mvn compile -pl api                      # verify API compiles
mvn compile -pl web                      # verify web compiles
mvn compile                              # full build

# Run each app separately (requires DB running):
mvn mn:run -pl api                       # API on :8080
mvn mn:run -pl web                       # Web on :8081
```

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
```

`answer_option` has a `UNIQUE(question_id, letter)` constraint — each letter A/B/C/D appears at most once per question.

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
