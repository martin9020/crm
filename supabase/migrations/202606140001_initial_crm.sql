create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'crm_app_role') then
    create type public.crm_app_role as enum ('admin', 'manager', 'viewer');
  end if;
end
$$;

create table if not exists public.crm_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role public.crm_app_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_projects (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_row integer,
  group_name text,
  project_name text not null,
  job_number text,
  installation_date date,
  fixed_date date,
  drawings_required_date date,
  monday_status text,
  stage text,
  calc_status text,
  detailing_start text,
  detailing_days_remaining integer,
  status text,
  rep text,
  owner_dynamics text,
  detailer text,
  order_value numeric(14, 2),
  user_folder_path text,
  drive_folder_path text,
  comments text,
  delivery_comments text,
  use_case text,
  ex_class text,
  wind_site text,
  wind_structure text,
  snow text,
  altitude text,
  wind_snow_loads text,
  structure_type text,
  style text,
  roof_shape text,
  support_type text,
  structure_size text,
  cladding_type text,
  gable_ends text,
  sidewalls text,
  dist_to_sea_k numeric(10, 2),
  framework_finish text,
  colour text,
  galv_holes_added text,
  bolt_cap_colour text,
  foundations_by text,
  concrete_type text,
  pad_finish text,
  created_on date,
  site_account text,
  site_account_industry text,
  site_post_code text,
  location text,
  acc_add_to_location text,
  nearest_ae text,
  billing_account text,
  approval_contact text,
  site_liaison_contact text,
  end_client_contact text,
  framework_installer text,
  groundworker text,
  pad_finisher text,
  inactive_reason text,
  invoiced_value numeric(14, 2),
  job_cost numeric(14, 2),
  job_profit numeric(14, 2),
  job_margin numeric(8, 4),
  low_margin_reason_description text,
  low_margin_reason_type text,
  opportunity text,
  order_confirmed date,
  mfg_zone text,
  mfg_cant_column text,
  item_id text,
  gwk_supplier_connect text,
  pad_finish_quotes text,
  new_word_doc text,
  files text,
  time_tracking text,
  pm_selection_list text,
  mfg_or_other text,
  pm_required_items text,
  email text,
  rams_sign_off text,
  mobile_phone text,
  rams text,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_project_contacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.crm_projects(id) on delete cascade,
  contact_type text not null,
  name text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.crm_projects(id) on delete cascade,
  body text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_project_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.crm_projects(id) on delete cascade,
  activity_type text not null,
  title text not null,
  body text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_file text not null,
  row_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  status text not null default 'completed',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists crm_projects_group_name_idx on public.crm_projects(group_name);
create index if not exists crm_projects_stage_idx on public.crm_projects(stage);
create index if not exists crm_projects_monday_status_idx on public.crm_projects(monday_status);
create index if not exists crm_projects_job_number_idx on public.crm_projects(job_number);
create index if not exists crm_projects_installation_date_idx on public.crm_projects(installation_date);
create index if not exists crm_project_notes_project_id_idx on public.crm_project_notes(project_id);
create index if not exists crm_project_contacts_project_id_idx on public.crm_project_contacts(project_id);
create index if not exists crm_project_activity_project_id_idx on public.crm_project_activity(project_id);

create or replace function public.crm_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists crm_profiles_set_updated_at on public.crm_profiles;
create trigger crm_profiles_set_updated_at
before update on public.crm_profiles
for each row execute function public.crm_set_updated_at();

drop trigger if exists crm_projects_set_updated_at on public.crm_projects;
create trigger crm_projects_set_updated_at
before update on public.crm_projects
for each row execute function public.crm_set_updated_at();

drop trigger if exists crm_project_contacts_set_updated_at on public.crm_project_contacts;
create trigger crm_project_contacts_set_updated_at
before update on public.crm_project_contacts
for each row execute function public.crm_set_updated_at();

create or replace function public.crm_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.crm_profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists crm_on_auth_user_created on auth.users;
create trigger crm_on_auth_user_created
after insert on auth.users
for each row execute function public.crm_handle_new_user();

create or replace function public.crm_current_user_role()
returns public.crm_app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.crm_profiles where id = auth.uid()),
    'viewer'::public.crm_app_role
  );
$$;

alter table public.crm_profiles enable row level security;
alter table public.crm_projects enable row level security;
alter table public.crm_project_contacts enable row level security;
alter table public.crm_project_notes enable row level security;
alter table public.crm_project_activity enable row level security;
alter table public.crm_import_runs enable row level security;

drop policy if exists "profiles can read own profile" on public.crm_profiles;
create policy "profiles can read own profile"
on public.crm_profiles for select
to authenticated
using (id = auth.uid() or public.crm_current_user_role() = 'admin');

drop policy if exists "admins can update profiles" on public.crm_profiles;
create policy "admins can update profiles"
on public.crm_profiles for update
to authenticated
using (public.crm_current_user_role() = 'admin')
with check (public.crm_current_user_role() = 'admin');

drop policy if exists "authenticated users can read projects" on public.crm_projects;
create policy "authenticated users can read projects"
on public.crm_projects for select
to authenticated
using (true);

drop policy if exists "managers can insert projects" on public.crm_projects;
create policy "managers can insert projects"
on public.crm_projects for insert
to authenticated
with check (public.crm_current_user_role() in ('admin', 'manager'));

drop policy if exists "managers can update projects" on public.crm_projects;
create policy "managers can update projects"
on public.crm_projects for update
to authenticated
using (public.crm_current_user_role() in ('admin', 'manager'))
with check (public.crm_current_user_role() in ('admin', 'manager'));

drop policy if exists "admins can delete projects" on public.crm_projects;
create policy "admins can delete projects"
on public.crm_projects for delete
to authenticated
using (public.crm_current_user_role() = 'admin');

drop policy if exists "authenticated users can read contacts" on public.crm_project_contacts;
create policy "authenticated users can read contacts"
on public.crm_project_contacts for select
to authenticated
using (true);

drop policy if exists "managers can manage contacts" on public.crm_project_contacts;
create policy "managers can manage contacts"
on public.crm_project_contacts for all
to authenticated
using (public.crm_current_user_role() in ('admin', 'manager'))
with check (public.crm_current_user_role() in ('admin', 'manager'));

drop policy if exists "authenticated users can read notes" on public.crm_project_notes;
create policy "authenticated users can read notes"
on public.crm_project_notes for select
to authenticated
using (true);

drop policy if exists "authenticated users can create notes" on public.crm_project_notes;
create policy "authenticated users can create notes"
on public.crm_project_notes for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "note owners and managers can delete notes" on public.crm_project_notes;
create policy "note owners and managers can delete notes"
on public.crm_project_notes for delete
to authenticated
using (created_by = auth.uid() or public.crm_current_user_role() in ('admin', 'manager'));

drop policy if exists "authenticated users can read activity" on public.crm_project_activity;
create policy "authenticated users can read activity"
on public.crm_project_activity for select
to authenticated
using (true);

drop policy if exists "managers can create activity" on public.crm_project_activity;
create policy "managers can create activity"
on public.crm_project_activity for insert
to authenticated
with check (public.crm_current_user_role() in ('admin', 'manager'));

drop policy if exists "admins can read import runs" on public.crm_import_runs;
create policy "admins can read import runs"
on public.crm_import_runs for select
to authenticated
using (public.crm_current_user_role() = 'admin');

