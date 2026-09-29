-- 004_add_role_gerencia.sql
--
-- Agrega el rol 'gerencia' (visión general de la operación, distinta a
-- Jefe de Tienda) al tipo app_role ya existente en producción.
--
-- IMPORTANTE: Postgres no permite usar un valor de enum recién agregado en
-- la misma transacción/consulta donde se agregó. Corre este archivo SOLO,
-- espera a que diga "Success", y recién después corre cualquier otra
-- consulta que use 'gerencia' (allowed_users_real.sql, questions.sql, etc.)
-- en una consulta nueva.

alter type app_role add value if not exists 'gerencia';
