--liquibase formatted sql
--changeset init:022
-- Snapshot del tag de la pregunta en el intento, para que editar o borrar la
-- pregunta no altere los resultados ya registrados.
ALTER TABLE mock_exam_attempt_item ADD COLUMN tag VARCHAR(100);
