--liquibase formatted sql
--changeset init:002
CREATE TABLE question (
    id          BIGSERIAL    PRIMARY KEY,
    text        TEXT         NOT NULL,
    category    VARCHAR(100),
    exam_type_id BIGINT      NOT NULL REFERENCES exam_type(id),
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_question_exam_type ON question(exam_type_id);
