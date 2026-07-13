-- Admin/prestador auth and history tables for CalendarMate.
-- Run in Supabase SQL editor. The backend uses the service key, so keep RLS
-- enabled only if you add matching service-role policies.

create table if not exists public.admin_users (
  id text primary key,
  phone_digits text not null unique,
  name text not null,
  role text not null check (role in ('OWNER', 'PROVIDER')),
  active boolean not null default true,
  created_at bigint not null default extract(epoch from now())::bigint,
  last_login_at bigint
);

create table if not exists public.admin_sessions (
  session_id text primary key,
  admin_user_id text not null references public.admin_users(id),
  token_hash text not null unique,
  created_at bigint not null,
  expires_at bigint not null,
  last_seen_at bigint,
  revoked_at bigint
);

create index if not exists idx_admin_sessions_token_hash on public.admin_sessions(token_hash);
create index if not exists idx_admin_sessions_expires_at on public.admin_sessions(expires_at);

create table if not exists public.booking_history_records (
  event_id text primary key,
  event_link text,
  service_type text,
  service_notes text,
  start_epoch bigint not null,
  end_epoch bigint,
  client_first_name text,
  client_last_name text,
  client_email text,
  client_phone text,
  client_cep text,
  client_street text,
  client_neighborhood text,
  client_number text,
  client_complement text,
  client_city text,
  client_state text,
  client_address_line text,
  status text,
  assigned_provider_id text,
  assigned_provider_name text,
  assigned_provider_phone text,
  archived_at bigint not null
);

alter table public.booking_history_records
  add column if not exists service_notes text;

create index if not exists idx_booking_history_start_epoch on public.booking_history_records(start_epoch desc);
create index if not exists idx_booking_history_provider on public.booking_history_records(assigned_provider_id);

-- Required owner seed used by the default backend allowlist.
insert into public.admin_users (id, phone_digits, name, role, active)
values
  ('owner-main', '31995438467', 'SG Admin', 'OWNER', true)
on conflict (id) do update set
  phone_digits = excluded.phone_digits,
  name = excluded.name,
  role = excluded.role,
  active = excluded.active;

-- Provider registry. Replace phone_digits with the real provider phones before production.
insert into public.admin_users (id, phone_digits, name, role, active)
values
  ('provider-1', '31900000001', 'Prestador 1', 'PROVIDER', true),
  ('provider-2', '31900000002', 'Prestador 2', 'PROVIDER', true),
  ('provider-3', '31900000003', 'Prestador 3', 'PROVIDER', true)
on conflict (id) do update set
  phone_digits = excluded.phone_digits,
  name = excluded.name,
  role = excluded.role,
  active = excluded.active;
