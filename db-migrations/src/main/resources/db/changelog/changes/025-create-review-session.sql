--liquibase formatted sql
--changeset init:025
CREATE TABLE review_session (
    id              BIGSERIAL   PRIMARY KEY,
    user_id         BIGINT      NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    exam_type_id    BIGINT      NOT NULL REFERENCES exam_type(id),
    categories      TEXT,
    tags            TEXT,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    finished_at     TIMESTAMP
);

CREATE INDEX idx_review_session_user ON review_session(user_id);

CREATE TABLE review_session_item (
    id              BIGSERIAL   PRIMARY KEY,
    session_id      BIGINT      NOT NULL REFERENCES review_session(id) ON DELETE CASCADE,
    question_id     BIGINT      NOT NULL REFERENCES question(id) ON DELETE CASCADE,
    position        INT         NOT NULL,
    selected_letter CHAR(1),
    is_correct      BOOLEAN,
    answered_at     TIMESTAMP,
    UNIQUE(session_id, position)
);

CREATE INDEX idx_review_session_item_session  ON review_session_item(session_id);
CREATE INDEX idx_review_session_item_question ON review_session_item(question_id);
