--liquibase formatted sql
--changeset init:021
-- Tag con el que se filtró la partida del modo libre (opcional).
ALTER TABLE free_session ADD COLUMN tag VARCHAR(100);
