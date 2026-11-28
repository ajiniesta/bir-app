--liquibase formatted sql
--changeset init:027
ALTER TABLE review_session
    ADD COLUMN only_failed BOOLEAN NOT NULL DEFAULT FALSE;
