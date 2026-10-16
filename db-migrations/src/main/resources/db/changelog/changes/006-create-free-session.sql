--liquibase formatted sql
--changeset init:006
CREATE TABLE free_session (
    id              BIGSERIAL   PRIMARY KEY,
    user_id         BIGINT      NOT NULL REFERENCES app_user(id),
    exam_type_id    BIGINT      REFERENCES exam_type(id),
    category        VARCHAR(100),
    requested_count INT         NOT NULL,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    finished_at     TIMESTAMP
);

CREATE INDEX idx_free_session_user ON free_session(user_id);
