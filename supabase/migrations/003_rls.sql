-- 003_rls.sql
-- Activa RLS en todas las tablas y define quién puede leer/escribir qué.
-- Regla de oro: un usuario nunca lee respuestas ajenas ni edita un formulario
-- ya enviado, sin importar lo que mande el navegador.

alter table locations enable row level security;
alter table allowed_users enable row level security;
alter table profiles enable row level security;
alter table questions enable row level security;
alter table submissions enable row level security;
alter table answers enable row level security;

-- profiles: cada quien ve el suyo, admin ve todos. Nadie escribe desde el
-- cliente (el trigger handle_new_user usa security definer).
create policy profiles_select on profiles
  for select using (id = auth.uid() or current_app_role() = 'admin');

-- allowed_users: solo admin.
create policy allowed_users_all on allowed_users
  for all using (current_app_role() = 'admin')
  with check (current_app_role() = 'admin');

-- locations: cualquier usuario autenticado puede leer; solo admin escribe.
create policy locations_select on locations
  for select using (auth.uid() is not null);

create policy locations_write on locations
  for insert with check (current_app_role() = 'admin');
create policy locations_update on locations
  for update using (current_app_role() = 'admin') with check (current_app_role() = 'admin');
create policy locations_delete on locations
  for delete using (current_app_role() = 'admin');

-- questions: activas y del rol del usuario; admin ve y edita todas.
create policy questions_select on questions
  for select using (
    current_app_role() = 'admin'
    or (active and current_app_role() = any (role_target))
  );

create policy questions_write on questions
  for insert with check (current_app_role() = 'admin');
create policy questions_update on questions
  for update using (current_app_role() = 'admin') with check (current_app_role() = 'admin');
create policy questions_delete on questions
  for delete using (current_app_role() = 'admin');

-- submissions: cada quien ve/crea/edita la suya mientras esté en draft;
-- admin ve todas y puede reabrir (pasar de submitted a draft).
create policy submissions_select on submissions
  for select using (user_id = auth.uid() or current_app_role() = 'admin');

create policy submissions_insert on submissions
  for insert with check (user_id = auth.uid() and status = 'draft');

create policy submissions_update on submissions
  for update using (
    (user_id = auth.uid() and status = 'draft') or current_app_role() = 'admin'
  )
  with check (
    (user_id = auth.uid() and status in ('draft', 'submitted')) or current_app_role() = 'admin'
  );

-- answers: cada quien ve/edita las de su propia submission mientras esté en
-- draft; admin ve todas.
create policy answers_select on answers
  for select using (
    current_app_role() = 'admin'
    or exists (
      select 1 from submissions s
      where s.id = answers.submission_id and s.user_id = auth.uid()
    )
  );

create policy answers_insert on answers
  for insert with check (
    exists (
      select 1 from submissions s
      where s.id = answers.submission_id
        and s.user_id = auth.uid()
        and s.status = 'draft'
    )
  );

create policy answers_update on answers
  for update using (
    exists (
      select 1 from submissions s
      where s.id = answers.submission_id
        and s.user_id = auth.uid()
        and s.status = 'draft'
    )
  )
  with check (
    exists (
      select 1 from submissions s
      where s.id = answers.submission_id
        and s.user_id = auth.uid()
        and s.status = 'draft'
    )
  );

create policy answers_admin_all on answers
  for all using (current_app_role() = 'admin') with check (current_app_role() = 'admin');
