--liquibase formatted sql
--changeset init:004 context:seed
INSERT INTO exam_type (code, name) VALUES
    ('MIR',  'Médico Interno Residente'),
    ('EIR',  'Enfermero Interno Residente'),
    ('BIR',  'Biólogo Interno Residente'),
    ('FIR',  'Farmacéutico Interno Residente'),
    ('PIR',  'Psicólogo Interno Residente'),
    ('QIR',  'Químico Interno Residente'),
    ('RFIR', 'Radiofísico Interno Residente');
