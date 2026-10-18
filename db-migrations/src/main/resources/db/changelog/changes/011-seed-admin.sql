--liquibase formatted sql
--changeset init:011 context:seed
-- Usuario administrador. Credenciales: admin / admin1234 (hash BCrypt, coste 12).
INSERT INTO app_user (username, password_hash, display_name, role) VALUES
    ('admin', '$2a$12$B3WPx9y9uByT1WtS8SEICeDbUCEUBbCt5xKE1y8WuLe1hWVzJ/bZm', 'Administrador', 'ADMIN');

-- El usuario demo pasa a ser creador: crea, edita y resuelve preguntas.
UPDATE app_user SET role = 'CREATOR' WHERE username = 'demo';
