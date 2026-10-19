--liquibase formatted sql
--changeset init:017
-- Propuestas de respuesta alternativa: un usuario puede impugnar la respuesta
-- correcta de una pregunta (por estar mal o ser conflictiva), indicando otra
-- opción y/o un texto alternativo, con un motivo obligatorio. ADMIN/CREATOR las
-- revisan (aceptar/rechazar + nota) y pueden aplicar el cambio a la pregunta.
CREATE TABLE answer_proposal (
    id              BIGSERIAL    PRIMARY KEY,
    question_id     BIGINT       NOT NULL REFERENCES question(id) ON DELETE CASCADE,
    proposed_by     BIGINT       NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    proposed_letter CHAR(1),
    proposed_text   TEXT,
    comment         TEXT         NOT NULL,
    source          VARCHAR(30)  NOT NULL, -- FREE_SESSION | MOCK_EXAM_ATTEMPT
    source_id       BIGINT,
    position        INT,
    selected_letter CHAR(1),
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING', -- PENDING | ACCEPTED | REJECTED
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    reviewed_by     BIGINT       REFERENCES app_user(id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMP,
    reviewer_note   TEXT,
    applied_by      BIGINT       REFERENCES app_user(id) ON DELETE SET NULL,
    applied_at      TIMESTAMP,
    -- Una sola propuesta por usuario y pregunta (se actualiza mientras no esté aceptada).
    UNIQUE (question_id, proposed_by)
);

CREATE INDEX idx_answer_proposal_status   ON answer_proposal(status);
CREATE INDEX idx_answer_proposal_question ON answer_proposal(question_id);
