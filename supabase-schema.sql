-- SUBCLEAN Academy — схема базы данных для Supabase
-- Выполнить целиком один раз в Supabase: SQL Editor -> New query -> вставить -> Run

create extension if not exists pgcrypto;

-- ---------- Таблицы ----------

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  login text unique not null,
  password_hash text not null,
  role text not null check (role in ('admin','viewer')),
  created_at timestamptz default now()
);

create table if not exists app_sessions (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  login text not null,
  role text not null,
  created_at timestamptz default now()
);

create table if not exists app_content (
  id int primary key default 1,
  edits jsonb not null default '{}'::jsonb,
  quiz jsonb,
  updated_at timestamptz default now(),
  constraint app_content_single_row check (id = 1)
);
insert into app_content (id, edits, quiz)
  values (1, '{}'::jsonb, null)
  on conflict (id) do nothing;

create table if not exists app_progress (
  user_id uuid primary key references app_users(id) on delete cascade,
  login text not null,
  completed jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- ---------- Блокируем прямой доступ к таблицам ----------
-- Весь доступ идёт только через функции ниже (SECURITY DEFINER).
-- RLS включена, политик не задаём -> прямые запросы к таблицам через API запрещены.

alter table app_users enable row level security;
alter table app_sessions enable row level security;
alter table app_content enable row level security;
alter table app_progress enable row level security;

-- ---------- Стартовые учётные записи ----------
-- Логин администратора: VENIAMIN / пароль: SUBCLEAN
-- Логин клинера: test / пароль: test
-- Пароли и роли можно позже поменять из панели администратора на сайте.

insert into app_users (login, password_hash, role)
values
  ('VENIAMIN', crypt('SUBCLEAN', gen_salt('bf')), 'admin'),
  ('test', crypt('test', gen_salt('bf')), 'viewer')
on conflict (login) do nothing;

-- ---------- Служебная функция: проверка токена администратора ----------

create or replace function require_admin(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  select user_id into uid from app_sessions where token = p_token and role = 'admin';
  if uid is null then
    raise exception 'not_authorized';
  end if;
  return uid;
end;
$$;

-- ---------- Вход ----------

create or replace function app_login(p_login text, p_password text)
returns table(token uuid, role text, login text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  u app_users%rowtype;
  t uuid;
begin
  select * into u from app_users where lower(app_users.login) = lower(p_login);
  if not found or u.password_hash <> crypt(p_password, u.password_hash) then
    raise exception 'invalid_credentials';
  end if;
  insert into app_sessions(user_id, login, role) values (u.id, u.login, u.role)
    returning app_sessions.token into t;
  return query select t, u.role, u.login;
end;
$$;

create or replace function app_logout(p_token uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from app_sessions where token = p_token;
$$;

-- ---------- Контент (модули + тест) ----------
-- Чтение доступно всем (это учебный текст, не секрет).
-- Запись — только администратору.

create or replace function get_content()
returns table(edits jsonb, quiz jsonb)
language sql
security definer
set search_path = public
as $$
  select app_content.edits, app_content.quiz from app_content where id = 1;
$$;

create or replace function save_content(p_token uuid, p_edits jsonb, p_quiz jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_admin(p_token);
  update app_content set edits = p_edits, quiz = p_quiz, updated_at = now() where id = 1;
end;
$$;

-- ---------- Пользователи (только администратор) ----------

create or replace function list_users(p_token uuid)
returns table(login text, role text)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_admin(p_token);
  return query select app_users.login, app_users.role from app_users order by app_users.login;
end;
$$;

create or replace function create_user(p_token uuid, p_login text, p_password text, p_role text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform require_admin(p_token);
  if p_login is null or length(trim(p_login)) = 0 then
    raise exception 'empty_login';
  end if;
  if p_password is null or length(trim(p_password)) = 0 then
    raise exception 'empty_password';
  end if;
  if p_role not in ('admin','viewer') then
    raise exception 'bad_role';
  end if;
  if exists (select 1 from app_users where lower(login) = lower(p_login)) then
    raise exception 'login_taken';
  end if;
  insert into app_users(login, password_hash, role) values (p_login, crypt(p_password, gen_salt('bf')), p_role);
end;
$$;

-- Обновление существующего пользователя: переименование логина, смена роли,
-- и (опционально) смена пароля. Если p_password пуст/NULL — пароль не меняется.
create or replace function update_user(p_token uuid, p_old_login text, p_new_login text, p_password text, p_role text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  remaining_admins int;
  was_admin boolean;
begin
  perform require_admin(p_token);
  if p_new_login is null or length(trim(p_new_login)) = 0 then
    raise exception 'empty_login';
  end if;
  if p_role not in ('admin','viewer') then
    raise exception 'bad_role';
  end if;
  if not exists (select 1 from app_users where lower(login) = lower(p_old_login)) then
    raise exception 'not_found';
  end if;
  if lower(p_new_login) <> lower(p_old_login)
     and exists (select 1 from app_users where lower(login) = lower(p_new_login)) then
    raise exception 'login_taken';
  end if;

  select role = 'admin' into was_admin from app_users where lower(login) = lower(p_old_login);
  if was_admin and p_role <> 'admin' then
    select count(*) into remaining_admins from app_users
      where role = 'admin' and lower(login) <> lower(p_old_login);
    if remaining_admins = 0 then
      raise exception 'last_admin';
    end if;
  end if;

  if p_password is not null and length(trim(p_password)) > 0 then
    update app_users
      set login = p_new_login, password_hash = crypt(p_password, gen_salt('bf')), role = p_role
      where lower(login) = lower(p_old_login);
  else
    update app_users
      set login = p_new_login, role = p_role
      where lower(login) = lower(p_old_login);
  end if;
end;
$$;

create or replace function delete_user(p_token uuid, p_login text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_count int;
begin
  perform require_admin(p_token);
  select count(*) into admin_count from app_users where role = 'admin';
  if admin_count <= 1 and exists (select 1 from app_users where lower(login) = lower(p_login) and role = 'admin') then
    raise exception 'last_admin';
  end if;
  delete from app_users where lower(login) = lower(p_login);
end;
$$;

-- ---------- Прогресс обучения (свой у каждого пользователя) ----------

create or replace function get_progress(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  result jsonb;
begin
  select user_id into uid from app_sessions where token = p_token;
  if uid is null then
    raise exception 'not_authorized';
  end if;
  select completed into result from app_progress where user_id = uid;
  return coalesce(result, '[]'::jsonb);
end;
$$;

create or replace function save_progress(p_token uuid, p_completed jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  ulogin text;
begin
  select user_id, login into uid, ulogin from app_sessions where token = p_token;
  if uid is null then
    raise exception 'not_authorized';
  end if;
  insert into app_progress(user_id, login, completed, updated_at)
    values (uid, ulogin, p_completed, now())
  on conflict (user_id) do update set completed = excluded.completed, updated_at = now();
end;
$$;

-- ---------- Права на выполнение функций для анонимного доступа с сайта ----------

grant execute on function app_login(text, text) to anon;
grant execute on function app_logout(uuid) to anon;
grant execute on function get_content() to anon;
grant execute on function save_content(uuid, jsonb, jsonb) to anon;
grant execute on function list_users(uuid) to anon;
grant execute on function create_user(uuid, text, text, text) to anon;
grant execute on function update_user(uuid, text, text, text, text) to anon;
grant execute on function delete_user(uuid, text) to anon;
grant execute on function get_progress(uuid) to anon;
grant execute on function save_progress(uuid, jsonb) to anon;
