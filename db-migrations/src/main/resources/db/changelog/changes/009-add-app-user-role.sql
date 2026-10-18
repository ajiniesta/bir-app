--liquibase formatted sql
--changeset init:009
-- Rol del usuario: ADMIN, CREATOR o USER. Los usuarios existentes pasan a USER.
ALTER TABLE app_user ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER';
