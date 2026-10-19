--liquibase formatted sql
--changeset init:015
-- Snapshot de cada pregunta dentro de un intento: texto, categoría y letra
-- correcta se congelan al iniciar, de modo que editar o borrar la pregunta no
-- altere los resultados ya registrados. question_id queda a NULL si se borra.
CREATE TABLE mock_exam_attempt_item (
    id             BIGSERIAL    PRIMARY KEY,
    attempt_id     BIGINT       NOT NULL REFERENCES mock_exam_attempt(id) ON DELETE CASCADE,
    question_id    BIGINT       REFERENCES question(id) ON DELETE SET NULL,
    position       INT          NOT NULL,
    question_text  TEXT         NOT NULL,
    category       VARCHAR(100),
    selected_letter CHAR(1),
    correct_letter CHAR(1)      NOT NULL,
    is_correct     BOOLEAN,
    answered_at    TIMESTAMP,
    UNIQUE(attempt_id, position)
);

CREATE INDEX idx_mock_exam_attempt_item_attempt ON mock_exam_attempt_item(attempt_id);
