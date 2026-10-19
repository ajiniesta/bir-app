--liquibase formatted sql
--changeset init:012
-- Un "simulacro": colección de preguntas curada por ADMIN/CREATOR.
CREATE TABLE mock_exam (
    id           BIGSERIAL    PRIMARY KEY,
    title        VARCHAR(200) NOT NULL,
    description  TEXT,
    exam_type_id BIGINT       NOT NULL REFERENCES exam_type(id),
    created_by   BIGINT       REFERENCES app_user(id) ON DELETE SET NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mock_exam_exam_type ON mock_exam(exam_type_id);
