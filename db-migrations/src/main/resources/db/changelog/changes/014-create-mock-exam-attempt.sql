--liquibase formatted sql
--changeset init:014
-- Cada resolución de un simulacro por parte de un usuario. Se permiten intentos
-- ilimitados; el resumen (total/respondidas/acertadas) se guarda para listados.
CREATE TABLE mock_exam_attempt (
    id              BIGSERIAL PRIMARY KEY,
    mock_exam_id    BIGINT    NOT NULL REFERENCES mock_exam(id) ON DELETE CASCADE,
    user_id         BIGINT    NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    started_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    finished_at     TIMESTAMP,
    total_questions INT       NOT NULL,
    answered_count  INT       NOT NULL DEFAULT 0,
    correct_count   INT       NOT NULL DEFAULT 0
);

CREATE INDEX idx_mock_exam_attempt_user      ON mock_exam_attempt(user_id);
CREATE INDEX idx_mock_exam_attempt_mock_exam ON mock_exam_attempt(mock_exam_id);
