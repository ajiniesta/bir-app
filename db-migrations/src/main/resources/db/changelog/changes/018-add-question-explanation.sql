--liquibase formatted sql
--changeset init:018
-- Explicación opcional de una pregunta: el porqué de la respuesta correcta.
-- Se muestra al responder en el modo libre y en los resultados (nunca antes).
ALTER TABLE question ADD COLUMN explanation TEXT;
