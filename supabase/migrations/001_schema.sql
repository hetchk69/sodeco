-- 001_schema.sql
-- Esquema base: tipos, tablas y restricciones. Sin RLS todavía (ver 003_rls.sql).

create extension if not exists pgcrypto;

create type app_role as enum ('jefe_tienda', 'asesor_tienda', 'jefe_bodega', 'gerencia', 'admin');

create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('store', 'warehouse'))
);

create table allowed_users (
  phone text primary key,
  full_name text not null,
  role app_role not null,
  location_id uuid references locations(id)
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text not null,
  full_name text not null,
  role app_role not null,
  location_id uuid references locations(id)
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  role_target app_role[] not null,
  section text not null,
  text text not null,
  purpose text,
  answer_type text not null default 'text' check (answer_type in ('text', 'number', 'choice')),
  choices text[],
  position int not null,
  active boolean not null default true
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references profiles(id),
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  submitted_at timestamptz
);

create table answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  question_id uuid not null references questions(id),
  value_text text,
  value_number numeric,
  updated_at timestamptz not null default now(),
  unique (submission_id, question_id)
);

create index answers_submission_id_idx on answers(submission_id);
create index questions_role_target_idx on questions using gin (role_target);
