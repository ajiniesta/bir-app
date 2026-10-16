--liquibase formatted sql
--changeset init:007
CREATE TABLE session_item (
    id              BIGSERIAL   PRIMARY KEY,
    session_id      BIGINT      NOT NULL REFERENCES free_session(id) ON DELETE CASCADE,
    question_id     BIGINT      NOT NULL REFERENCES question(id) ON DELETE CASCADE,
    position        INT         NOT NULL,
    selected_letter CHAR(1),
    is_correct      BOOLEAN,
    answered_at     TIMESTAMP,
    UNIQUE(session_id, position)
);

CREATE INDEX idx_session_item_session  ON session_item(session_id);
CREATE INDEX idx_session_item_question ON session_item(question_id);
