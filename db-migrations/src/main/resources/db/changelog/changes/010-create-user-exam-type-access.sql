--liquibase formatted sql
--changeset init:010
-- Bancos de preguntas (tipos de examen) asignados a cada usuario normal.
-- ADMIN y CREATOR tienen acceso a todos los bancos sin necesidad de filas aquí.
CREATE TABLE user_exam_type_access (
    user_id      BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    exam_type_id BIGINT NOT NULL REFERENCES exam_type(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, exam_type_id)
);

CREATE INDEX idx_user_exam_type_access_user ON user_exam_type_access(user_id);
