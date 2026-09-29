-- 002_functions_triggers.sql
-- Funciones auxiliares y el trigger que crea el profile a partir de allowed_users.

-- Rol del usuario autenticado actual. security definer + search_path fijo para que
-- las políticas RLS puedan usarla sin recursión ni riesgo de "search_path hijacking".
create or replace function current_app_role() returns app_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

-- Al crear un auth.users (con create_users.sh), busca el teléfono en allowed_users
-- y crea el profile con el rol y la ubicación ya decididos por el administrador.
-- Si el teléfono no está autorizado, rechaza la creación del usuario.
--
-- El login usa email+contraseña (no el proveedor Phone de Supabase, para no
-- depender de Twilio ni de ningún proveedor de SMS). El "email" de cada
-- usuario es en realidad su teléfono sin el "+" seguido de "@..." (ver
-- EMAIL_DOMAIN en js/config.js), así que aquí extraemos esos dígitos de
-- new.email y los comparamos contra allowed_users.phone (quitando también
-- ahí un posible "+" inicial).
--
-- Corre AFTER INSERT (no BEFORE): profiles.id tiene una FK hacia auth.users(id),
-- así que esa fila debe existir ya cuando insertamos en profiles. Si el
-- teléfono no está autorizado, el raise exception aquí revierte toda la
-- transacción de todos modos (incluida la fila que se acababa de crear en
-- auth.users), así que el efecto de "rechazar el registro" es el mismo.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  a allowed_users%rowtype;
  phone_digits text;
begin
  phone_digits := split_part(new.email, '@', 1);

  select * into a from allowed_users
  where ltrim(phone, '+') = phone_digits;

  if not found then
    raise exception 'Teléfono no autorizado';
  end if;

  insert into profiles (id, phone, full_name, role, location_id)
  values (new.id, a.phone, a.full_name, a.role, a.location_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Crea automáticamente la submission (en draft) la primera vez que un usuario
-- entra al formulario, para que form.js no tenga que hacerlo con una llave distinta.
create or replace function ensure_submission(p_user_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s_id uuid;
begin
  select id into s_id from submissions where user_id = p_user_id;
  if not found then
    insert into submissions (user_id) values (p_user_id) returning id into s_id;
  end if;
  return s_id;
end;
$$;
