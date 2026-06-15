--liquibase formatted sql
--changeset init:003
CREATE TABLE answer_option (
    id          BIGSERIAL    PRIMARY KEY,
    question_id BIGINT       NOT NULL REFERENCES question(id) ON DELETE CASCADE,
    letter      CHAR(1)      NOT NULL,
    text        TEXT         NOT NULL,
    is_correct  BOOLEAN      NOT NULL DEFAULT FALSE,
    UNIQUE(question_id, letter)
);

CREATE INDEX idx_answer_option_question ON answer_option(question_id);
