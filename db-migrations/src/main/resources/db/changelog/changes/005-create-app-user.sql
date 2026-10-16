--liquibase formatted sql
--changeset init:005
CREATE TABLE app_user (
    id            BIGSERIAL    PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    display_name  VARCHAR(100),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);
