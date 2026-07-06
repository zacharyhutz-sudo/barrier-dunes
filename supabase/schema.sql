-- Barrier Dunes HOA Admin Schema
-- Run this in Supabase Dashboard → SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'viewer' check (role in ('president', 'admin', 'editor', 'viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  unit_number text not null unique,
  display_name text,
  building text,
  lat numeric(10, 7),
  lng numeric(10, 7),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.item_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  description text,
  color text not null default '#c75b39',
  severity_rank int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.unit_items (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  item_type_id uuid not null references public.item_types(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'complete', 'not_applicable', 'unknown')),
  due_date date,
  completed_date date,
  notes text,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, item_type_id)
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  unit_id uuid references public.units(id) on delete set null,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_units_updated_at on public.units;
create trigger set_units_updated_at
before update on public.units
for each row execute function public.set_updated_at();

drop trigger if exists set_item_types_updated_at on public.item_types;
create trigger set_item_types_updated_at
before update on public.item_types
for each row execute function public.set_updated_at();

drop trigger if exists set_unit_items_updated_at on public.unit_items;
create trigger set_unit_items_updated_at
before update on public.unit_items
for each row execute function public.set_updated_at();

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.profiles
  where user_id = auth.uid()
    and active = true
  limit 1;
$$;

create or replace function public.current_user_is_active()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.units enable row level security;
alter table public.item_types enable row level security;
alter table public.unit_items enable row level security;
alter table public.activity_log enable row level security;

-- Supabase Data API grants. RLS still decides which rows each user can use.
grant usage on schema public to anon, authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_is_active() to authenticated;
grant select on public.profiles to authenticated;
grant select on public.units to authenticated;
grant select on public.item_types to authenticated;
grant select, insert, update, delete on public.unit_items to authenticated;
grant insert on public.activity_log to authenticated;
grant select on public.activity_log to authenticated;
grant insert, update, delete on public.units to authenticated;
grant insert, update, delete on public.item_types to authenticated;
grant insert, update, delete on public.profiles to authenticated;

-- Profiles policies.
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "President can manage profiles" on public.profiles;
create policy "President can manage profiles"
on public.profiles for all
to authenticated
using (public.current_user_role() = 'president')
with check (public.current_user_role() = 'president');

-- Unit policies.
drop policy if exists "Active users can read units" on public.units;
create policy "Active users can read units"
on public.units for select
to authenticated
using (public.current_user_is_active());

drop policy if exists "Admins can manage units" on public.units;
create policy "Admins can manage units"
on public.units for all
to authenticated
using (public.current_user_role() in ('president', 'admin'))
with check (public.current_user_role() in ('president', 'admin'));

-- Item type policies.
drop policy if exists "Active users can read item types" on public.item_types;
create policy "Active users can read item types"
on public.item_types for select
to authenticated
using (public.current_user_is_active());

drop policy if exists "Admins can manage item types" on public.item_types;
create policy "Admins can manage item types"
on public.item_types for all
to authenticated
using (public.current_user_role() in ('president', 'admin'))
with check (public.current_user_role() in ('president', 'admin'));

-- Unit item policies.
drop policy if exists "Active users can read unit items" on public.unit_items;
create policy "Active users can read unit items"
on public.unit_items for select
to authenticated
using (public.current_user_is_active());

drop policy if exists "Editors can insert unit items" on public.unit_items;
create policy "Editors can insert unit items"
on public.unit_items for insert
to authenticated
with check (public.current_user_role() in ('president', 'admin', 'editor'));

drop policy if exists "Editors can update unit items" on public.unit_items;
create policy "Editors can update unit items"
on public.unit_items for update
to authenticated
using (public.current_user_role() in ('president', 'admin', 'editor'))
with check (public.current_user_role() in ('president', 'admin', 'editor'));

drop policy if exists "Admins can delete unit items" on public.unit_items;
create policy "Admins can delete unit items"
on public.unit_items for delete
to authenticated
using (public.current_user_role() in ('president', 'admin'));

-- Activity log policies.
drop policy if exists "Active users can read activity" on public.activity_log;
create policy "Active users can read activity"
on public.activity_log for select
to authenticated
using (public.current_user_is_active());

drop policy if exists "Editors can insert activity" on public.activity_log;
create policy "Editors can insert activity"
on public.activity_log for insert
to authenticated
with check (public.current_user_role() in ('president', 'admin', 'editor'));

-- Realtime support.
do $$
begin
  alter publication supabase_realtime add table public.units;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.unit_items;
exception when duplicate_object then null;
end $$;

-- Starter item types. Adjust colors/severity anytime.
insert into public.item_types (slug, label, description, color, severity_rank)
values
  ('dues', 'Unpaid dues', 'Dues are unpaid or need attention.', '#b42318', 10),
  ('paint', 'Needs paint', 'Unit needs paint or exterior touch-up.', '#c75b39', 20),
  ('paperwork', 'Missing paperwork', 'Owner paperwork is missing or outdated.', '#d89c23', 30),
  ('insurance', 'Insurance needed', 'Insurance documentation is missing or outdated.', '#7c3aed', 40),
  ('inspection', 'Inspection needed', 'Inspection is needed or incomplete.', '#2563eb', 50),
  ('maintenance', 'Maintenance item', 'General maintenance issue.', '#0f766e', 60)
on conflict (slug) do update set
  label = excluded.label,
  description = excluded.description,
  color = excluded.color,
  severity_rank = excluded.severity_rank,
  is_active = true;

-- Optional starter unit so the map is not empty. Move or delete it later.
insert into public.units (unit_number, display_name, building, lat, lng, notes)
values ('150', 'Unit 150', null, 29.7485000, -85.3975000, 'Starter unit. Move this marker to the correct location.')
on conflict (unit_number) do nothing;

-- After creating your first Auth user in Supabase Dashboard → Authentication → Users,
-- copy that user's UUID and run this with your values:
--
-- insert into public.profiles (user_id, full_name, email, role, active)
-- values ('PASTE-AUTH-USER-UUID-HERE', 'Zachary Hutzell', 'zacharyhutz@gmail.com', 'president', true)
-- on conflict (user_id) do update set role = 'president', active = true;
