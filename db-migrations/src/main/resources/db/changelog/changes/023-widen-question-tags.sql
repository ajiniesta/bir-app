--liquibase formatted sql
--changeset init:023
-- Amplía la columna tag para permitir almacenar múltiples tags por pregunta.
ALTER TABLE question ALTER COLUMN tag TYPE TEXT;
ALTER TABLE mock_exam_attempt_item ALTER COLUMN tag TYPE TEXT;
