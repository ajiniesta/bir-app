--liquibase formatted sql
--changeset init:019
-- La explicación también se congela en el snapshot del intento, como el texto
-- y la categoría, para que editar la pregunta después no altere resultados ya
-- guardados.
ALTER TABLE mock_exam_attempt_item ADD COLUMN explanation TEXT;
