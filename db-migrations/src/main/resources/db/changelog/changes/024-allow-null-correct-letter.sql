--liquibase formatted sql
--changeset init:024
-- Permite preguntas invalidadas (sin ninguna opción correcta) en los intentos
-- de simulacro: correct_letter queda a NULL cuando la pregunta está invalidada.
ALTER TABLE mock_exam_attempt_item ALTER COLUMN correct_letter DROP NOT NULL;
