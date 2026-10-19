--liquibase formatted sql
--changeset init:013
-- Preguntas que componen cada simulacro, en el orden definido por el creador.
-- RESTRICT: no se puede borrar una pregunta que forme parte de un simulacro.
CREATE TABLE mock_exam_question (
    id           BIGSERIAL PRIMARY KEY,
    mock_exam_id BIGINT    NOT NULL REFERENCES mock_exam(id) ON DELETE CASCADE,
    question_id  BIGINT    NOT NULL REFERENCES question(id) ON DELETE RESTRICT,
    position     INT       NOT NULL,
    UNIQUE(mock_exam_id, position),
    UNIQUE(mock_exam_id, question_id)
);

CREATE INDEX idx_mock_exam_question_mock_exam ON mock_exam_question(mock_exam_id);
CREATE INDEX idx_mock_exam_question_question  ON mock_exam_question(question_id);
