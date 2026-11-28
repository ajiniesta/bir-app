--liquibase formatted sql
--changeset init:026
CREATE TABLE user_question_status (
    id                  BIGSERIAL   PRIMARY KEY,
    user_id             BIGINT      NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    question_id         BIGINT      NOT NULL REFERENCES question(id) ON DELETE CASCADE,
    status              VARCHAR(20) NOT NULL,
    consecutive_correct INT         NOT NULL DEFAULT 0,
    updated_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, question_id)
);

CREATE INDEX idx_user_question_status_user_status ON user_question_status(user_id, status);
CREATE INDEX idx_user_question_status_question    ON user_question_status(question_id);

ALTER TABLE review_session
    ADD COLUMN only_doubt BOOLEAN NOT NULL DEFAULT FALSE;
