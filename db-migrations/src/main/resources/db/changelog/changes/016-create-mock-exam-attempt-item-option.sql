--liquibase formatted sql
--changeset init:016
-- Opciones de respuesta tal y como estaban al iniciar el intento.
CREATE TABLE mock_exam_attempt_item_option (
    id         BIGSERIAL PRIMARY KEY,
    item_id    BIGINT    NOT NULL REFERENCES mock_exam_attempt_item(id) ON DELETE CASCADE,
    letter     CHAR(1)   NOT NULL,
    text       TEXT      NOT NULL,
    is_correct BOOLEAN   NOT NULL DEFAULT FALSE,
    UNIQUE(item_id, letter)
);

CREATE INDEX idx_mock_exam_attempt_item_option_item ON mock_exam_attempt_item_option(item_id);
