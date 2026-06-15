--liquibase formatted sql
--changeset init:001
CREATE TABLE exam_type (
    id      BIGSERIAL    PRIMARY KEY,
    code    VARCHAR(10)  NOT NULL UNIQUE,
    name    VARCHAR(100) NOT NULL
);
