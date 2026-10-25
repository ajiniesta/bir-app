--liquibase formatted sql
--changeset init:020
-- Etiqueta opcional de la pregunta. Sirve para agrupar preguntas (por ejemplo,
-- por tema) al crear simulacros o filtrar el banco.
ALTER TABLE question ADD COLUMN tag VARCHAR(100);

CREATE INDEX idx_question_tag ON question(tag);
