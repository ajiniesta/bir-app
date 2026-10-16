--liquibase formatted sql
--changeset init:008 context:seed
-- Usuario de ejemplo. Credenciales: demo / demo1234 (hash BCrypt, coste 10).
INSERT INTO app_user (username, password_hash, display_name) VALUES
    ('demo', '$2a$10$.GZQS2sEhl.fYDDoa8ptM.GXOnE2iLR/NumC8G3dUMu3Ve9MH6WCq', 'Usuario Demo');
