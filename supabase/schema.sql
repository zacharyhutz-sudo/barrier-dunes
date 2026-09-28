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


-- Admin workspace history upgrade (July 2026)
-- Barrier Dunes admin workspace, history, batch updates, and audit logging.
-- Safe to run more than once in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- Richer labels let one reusable editor use natural language for paint, dues, insurance, etc.
alter table public.item_types
  add column if not exists completion_action_label text not null default 'Mark complete',
  add column if not exists completion_date_label text not null default 'Completed on',
  add column if not exists due_date_label text not null default 'Next due',
  add column if not exists supports_due_date boolean not null default true,
  add column if not exists default_interval_months integer;

alter table public.unit_items
  add column if not exists period_label text,
  add column if not exists updated_by_name text;

alter table public.activity_log
  add column if not exists actor_name text,
  add column if not exists table_name text,
  add column if not exists record_id uuid;

create table if not exists public.unit_item_events (
  id uuid primary key default gen_random_uuid(),
  unit_item_id uuid references public.unit_items(id) on delete set null,
  unit_id uuid not null references public.units(id) on delete cascade,
  item_type_id uuid not null references public.item_types(id),
  event_type text not null check (event_type in ('initialized', 'opened', 'resolved', 'reopened', 'updated', 'note_added')),
  event_date date not null default current_date,
  previous_status text,
  new_status text,
  completed_date date,
  due_date date,
  period_label text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  actor_name text,
  created_at timestamptz not null default now()
);

create index if not exists unit_item_events_unit_date_idx
  on public.unit_item_events (unit_id, event_date desc, created_at desc);
create index if not exists unit_item_events_item_idx
  on public.unit_item_events (unit_item_id, created_at desc);
create index if not exists unit_items_due_date_idx
  on public.unit_items (due_date) where due_date is not null;

-- Fill the display name used by the dashboard without requiring access to auth.users.
create or replace function public.set_unit_item_actor()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_actor_name text;
begin
  v_user_id := coalesce(new.updated_by, auth.uid());
  new.updated_by := v_user_id;

  select coalesce(nullif(full_name, ''), nullif(email, ''), 'Administrator')
    into v_actor_name
  from public.profiles
  where user_id = v_user_id
  limit 1;

  new.updated_by_name := coalesce(v_actor_name, new.updated_by_name, 'System');
  return new;
end;
$$;

drop trigger if exists set_unit_item_actor_before_write on public.unit_items;
create trigger set_unit_item_actor_before_write
before insert or update on public.unit_items
for each row execute function public.set_unit_item_actor();

-- Create an immutable, user-facing history entry whenever meaningful current-state data changes.
create or replace function public.log_unit_item_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_type text;
  v_event_date date;
begin
  if tg_op = 'UPDATE' and row(
    old.status,
    old.completed_date,
    old.due_date,
    old.period_label,
    old.notes
  ) is not distinct from row(
    new.status,
    new.completed_date,
    new.due_date,
    new.period_label,
    new.notes
  ) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_event_type := 'initialized';
  elsif new.status = 'complete' and old.status is distinct from 'complete' then
    v_event_type := 'resolved';
  elsif old.status = 'complete' and new.status in ('open', 'unknown') then
    v_event_type := 'reopened';
  elsif new.status in ('open', 'unknown') and old.status not in ('open', 'unknown') then
    v_event_type := 'opened';
  elsif new.notes is distinct from old.notes
    and new.status is not distinct from old.status
    and new.completed_date is not distinct from old.completed_date
    and new.due_date is not distinct from old.due_date
    and new.period_label is not distinct from old.period_label then
    v_event_type := 'note_added';
  else
    v_event_type := 'updated';
  end if;

  v_event_date := case
    when v_event_type = 'resolved' then coalesce(new.completed_date, current_date)
    else current_date
  end;

  insert into public.unit_item_events (
    unit_item_id,
    unit_id,
    item_type_id,
    event_type,
    event_date,
    previous_status,
    new_status,
    completed_date,
    due_date,
    period_label,
    notes,
    created_by,
    actor_name
  ) values (
    new.id,
    new.unit_id,
    new.item_type_id,
    v_event_type,
    v_event_date,
    case when tg_op = 'UPDATE' then old.status else null end,
    new.status,
    new.completed_date,
    new.due_date,
    new.period_label,
    new.notes,
    new.updated_by,
    coalesce(new.updated_by_name, 'System')
  );

  return new;
end;
$$;

drop trigger if exists log_unit_item_event_after_write on public.unit_items;
create trigger log_unit_item_event_after_write
after insert or update on public.unit_items
for each row execute function public.log_unit_item_event();

-- Backfill one historical entry for each current record that predates this migration.
insert into public.unit_item_events (
  unit_item_id,
  unit_id,
  item_type_id,
  event_type,
  event_date,
  previous_status,
  new_status,
  completed_date,
  due_date,
  period_label,
  notes,
  created_by,
  actor_name,
  created_at
)
select
  ui.id,
  ui.unit_id,
  ui.item_type_id,
  case when ui.status = 'complete' then 'resolved' else 'initialized' end,
  coalesce(ui.completed_date, ui.updated_at::date, current_date),
  null,
  ui.status,
  ui.completed_date,
  ui.due_date,
  ui.period_label,
  ui.notes,
  ui.updated_by,
  coalesce(
    ui.updated_by_name,
    p.full_name,
    p.email,
    'System import'
  ),
  coalesce(ui.updated_at, now())
from public.unit_items ui
left join public.profiles p on p.user_id = ui.updated_by
where not exists (
  select 1 from public.unit_item_events e where e.unit_item_id = ui.id
);

-- Consistent transactional write used by both single-unit and batch interfaces.
create or replace function public.set_unit_item_status(
  p_unit_id uuid,
  p_item_type_id uuid,
  p_status text,
  p_completed_date date default null,
  p_due_date date default null,
  p_period_label text default null,
  p_notes text default null
)
returns public.unit_items
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result public.unit_items;
  v_due_date date := p_due_date;
  v_default_interval integer;
begin
  if coalesce(public.current_user_role(), '') not in ('president', 'admin', 'editor') then
    raise exception 'You do not have permission to update unit records.' using errcode = '42501';
  end if;

  if p_status not in ('open', 'complete', 'not_applicable', 'unknown') then
    raise exception 'Invalid status: %', p_status using errcode = '22023';
  end if;

  if not exists (select 1 from public.units where id = p_unit_id) then
    raise exception 'Unit not found.' using errcode = 'P0002';
  end if;

  select default_interval_months
    into v_default_interval
  from public.item_types
  where id = p_item_type_id and is_active = true;

  if not found then
    raise exception 'Active item type not found.' using errcode = 'P0002';
  end if;

  if p_status = 'not_applicable' then
    p_completed_date := null;
    v_due_date := null;
  elsif p_status <> 'complete' then
    p_completed_date := null;
  elsif p_completed_date is null then
    p_completed_date := current_date;
  end if;

  if p_status = 'complete'
    and v_due_date is null
    and v_default_interval is not null
    and v_default_interval > 0 then
    v_due_date := (p_completed_date + make_interval(months => v_default_interval))::date;
  end if;

  insert into public.unit_items (
    unit_id,
    item_type_id,
    status,
    completed_date,
    due_date,
    period_label,
    notes,
    updated_by
  ) values (
    p_unit_id,
    p_item_type_id,
    p_status,
    p_completed_date,
    v_due_date,
    nullif(trim(p_period_label), ''),
    nullif(trim(p_notes), ''),
    auth.uid()
  )
  on conflict (unit_id, item_type_id)
  do update set
    status = excluded.status,
    completed_date = excluded.completed_date,
    due_date = excluded.due_date,
    period_label = excluded.period_label,
    notes = excluded.notes,
    updated_by = auth.uid()
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.set_unit_item_status_batch(
  p_unit_ids uuid[],
  p_item_type_id uuid,
  p_status text,
  p_completed_date date default null,
  p_due_date date default null,
  p_period_label text default null,
  p_notes text default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_unit_id uuid;
  v_count integer := 0;
begin
  if coalesce(public.current_user_role(), '') not in ('president', 'admin', 'editor') then
    raise exception 'You do not have permission to update unit records.' using errcode = '42501';
  end if;

  if p_unit_ids is null or cardinality(p_unit_ids) = 0 then
    raise exception 'No units were selected.' using errcode = '22023';
  end if;

  foreach v_unit_id in array p_unit_ids loop
    perform public.set_unit_item_status(
      v_unit_id,
      p_item_type_id,
      p_status,
      p_completed_date,
      p_due_date,
      p_period_label,
      p_notes
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Initialize current-state rows whenever an active item type is added or reactivated.
create or replace function public.initialize_item_type_units()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.is_active = true and (tg_op = 'INSERT' or old.is_active is distinct from true) then
    insert into public.unit_items (unit_id, item_type_id, status, updated_by)
    select u.id, new.id, 'unknown', auth.uid()
    from public.units u
    where u.is_active = true
    on conflict (unit_id, item_type_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists initialize_item_type_units_after_write on public.item_types;
create trigger initialize_item_type_units_after_write
after insert or update of is_active on public.item_types
for each row execute function public.initialize_item_type_units();

-- Replace the earlier unit initializer so actor information and the history trigger are used.
create or replace function public.initialize_unit_items()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.unit_items (unit_id, item_type_id, status, updated_by)
  select new.id, i.id, 'unknown', auth.uid()
  from public.item_types i
  where i.is_active = true
  on conflict (unit_id, item_type_id) do nothing;
  return new;
end;
$$;

drop trigger if exists initialize_unit_items_after_insert on public.units;
create trigger initialize_unit_items_after_insert
after insert on public.units
for each row execute function public.initialize_unit_items();

-- Database-generated technical audit trail. Browser code cannot forge audit entries.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_actor_name text;
  v_unit_id uuid;
  v_record_id uuid;
begin
  select coalesce(nullif(full_name, ''), nullif(email, ''), 'Administrator')
    into v_actor_name
  from public.profiles
  where user_id = v_user_id
  limit 1;

  if tg_op = 'DELETE' then
    v_record_id := old.id;
    if tg_table_name = 'unit_items' then
      v_unit_id := old.unit_id;
    elsif tg_table_name = 'units' then
      v_unit_id := old.id;
    else
      v_unit_id := null;
    end if;
  else
    v_record_id := new.id;
    if tg_table_name = 'unit_items' then
      v_unit_id := new.unit_id;
    elsif tg_table_name = 'units' then
      v_unit_id := new.id;
    else
      v_unit_id := null;
    end if;
  end if;

  insert into public.activity_log (
    user_id,
    actor_name,
    unit_id,
    table_name,
    record_id,
    action,
    old_value,
    new_value
  ) values (
    v_user_id,
    coalesce(v_actor_name, 'System'),
    v_unit_id,
    tg_table_name,
    v_record_id,
    tg_table_name || '.' || lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists audit_units_changes on public.units;
create trigger audit_units_changes
after insert or update or delete on public.units
for each row execute function public.audit_row_change();

drop trigger if exists audit_item_types_changes on public.item_types;
create trigger audit_item_types_changes
after insert or update or delete on public.item_types
for each row execute function public.audit_row_change();

drop trigger if exists audit_profiles_changes on public.profiles;
create trigger audit_profiles_changes
after insert or update or delete on public.profiles
for each row execute function public.audit_row_change();

drop trigger if exists audit_unit_items_changes on public.unit_items;
create trigger audit_unit_items_changes
after insert or update or delete on public.unit_items
for each row execute function public.audit_row_change();

-- RLS and Data API permissions.
alter table public.unit_item_events enable row level security;

drop policy if exists "Active users can read unit item events" on public.unit_item_events;
create policy "Active users can read unit item events"
on public.unit_item_events for select
to authenticated
using (public.current_user_is_active());

grant select on public.unit_item_events to authenticated;
revoke insert, update, delete on public.unit_item_events from authenticated;
revoke insert, update, delete on public.activity_log from authenticated;
revoke all on function public.set_unit_item_status(uuid, uuid, text, date, date, text, text) from public, anon;
revoke all on function public.set_unit_item_status_batch(uuid[], uuid, text, date, date, text, text) from public, anon;
grant execute on function public.set_unit_item_status(uuid, uuid, text, date, date, text, text) to authenticated;
grant execute on function public.set_unit_item_status_batch(uuid[], uuid, text, date, date, text, text) to authenticated;

-- Ensure current records have actor names where possible.
update public.unit_items ui
set updated_by_name = coalesce(p.full_name, p.email, 'System')
from public.profiles p
where ui.updated_by = p.user_id
  and (ui.updated_by_name is null or ui.updated_by_name = '');

-- Natural language and default recurrence for starter item types.
update public.item_types set
  completion_action_label = 'Record Dues Payment',
  completion_date_label = 'Paid on',
  due_date_label = 'Due again',
  supports_due_date = true
where slug = 'dues';

update public.item_types set
  completion_action_label = 'Mark Painted',
  completion_date_label = 'Painted on',
  due_date_label = 'Inspect again',
  supports_due_date = true
where slug = 'paint';

update public.item_types set
  completion_action_label = 'Mark Received',
  completion_date_label = 'Received on',
  due_date_label = 'Renewal due',
  supports_due_date = true
where slug = 'paperwork';

update public.item_types set
  completion_action_label = 'Record Policy',
  completion_date_label = 'Received on',
  due_date_label = 'Expires',
  supports_due_date = true
where slug = 'insurance';

update public.item_types set
  completion_action_label = 'Complete Inspection',
  completion_date_label = 'Inspected on',
  due_date_label = 'Next inspection',
  supports_due_date = true
where slug = 'inspection';

update public.item_types set
  completion_action_label = 'Resolve Maintenance',
  completion_date_label = 'Resolved on',
  due_date_label = 'Follow up',
  supports_due_date = true
where slug = 'maintenance';

-- Realtime support for history updates.
do $$
begin
  alter publication supabase_realtime add table public.unit_item_events;
exception when duplicate_object then null;
end $$;


-- Spreadsheet-first admin + persistent maintenance dates upgrade (September 2026)
-- Keep this block in sync with migrations/20260928_spreadsheet_admin_maintenance_dates.sql.

alter table public.units
  add column if not exists owner_name text,
  add column if not exists owner_email text,
  add column if not exists owner_phone text;

alter table public.unit_items
  add column if not exists last_completed_date date;

update public.unit_items
set last_completed_date = completed_date
where last_completed_date is null
  and completed_date is not null;

alter table public.unit_items drop constraint if exists unit_items_status_check;
alter table public.unit_items
  add constraint unit_items_status_check
  check (status in ('open', 'monitor', 'complete', 'not_applicable', 'unknown'));

alter table public.unit_item_events
  add column if not exists last_completed_date date;

update public.unit_item_events
set last_completed_date = completed_date
where last_completed_date is null
  and completed_date is not null;

alter table public.unit_item_events drop constraint if exists unit_item_events_event_type_check;
alter table public.unit_item_events
  add constraint unit_item_events_event_type_check
  check (event_type in ('initialized', 'opened', 'resolved', 'reopened', 'updated', 'note_added', 'work_recorded'));

create or replace function public.log_unit_item_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_type text;
  v_event_date date;
begin
  if tg_op = 'UPDATE' and row(old.status, old.last_completed_date, old.due_date, old.period_label, old.notes)
    is not distinct from row(new.status, new.last_completed_date, new.due_date, new.period_label, new.notes) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_event_type := 'initialized';
  elsif new.last_completed_date is distinct from old.last_completed_date and new.last_completed_date is not null then
    v_event_type := 'work_recorded';
  elsif new.status = 'complete' and old.status is distinct from 'complete' then
    v_event_type := 'resolved';
  elsif old.status = 'complete' and new.status in ('open', 'monitor', 'unknown') then
    v_event_type := 'reopened';
  elsif new.status = 'open' and old.status is distinct from 'open' then
    v_event_type := 'opened';
  elsif new.notes is distinct from old.notes
    and new.status is not distinct from old.status
    and new.last_completed_date is not distinct from old.last_completed_date
    and new.due_date is not distinct from old.due_date
    and new.period_label is not distinct from old.period_label then
    v_event_type := 'note_added';
  else
    v_event_type := 'updated';
  end if;

  v_event_date := case
    when v_event_type = 'work_recorded' then coalesce(new.last_completed_date, current_date)
    when v_event_type = 'resolved' then coalesce(new.last_completed_date, new.completed_date, current_date)
    else current_date
  end;

  insert into public.unit_item_events (
    unit_item_id, unit_id, item_type_id, event_type, event_date,
    previous_status, new_status, completed_date, last_completed_date,
    due_date, period_label, notes, created_by, actor_name
  ) values (
    new.id, new.unit_id, new.item_type_id, v_event_type, v_event_date,
    case when tg_op = 'UPDATE' then old.status else null end,
    new.status, coalesce(new.last_completed_date, new.completed_date), new.last_completed_date,
    new.due_date, new.period_label, new.notes, new.updated_by,
    coalesce(new.updated_by_name, 'System')
  );
  return new;
end;
$$;

create or replace function public.set_unit_item_condition(
  p_unit_id uuid,
  p_item_type_id uuid,
  p_status text,
  p_last_completed_date date default null,
  p_notes text default null
)
returns public.unit_items
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result public.unit_items;
begin
  if coalesce(public.current_user_role(), '') not in ('president', 'admin', 'editor') then
    raise exception 'You do not have permission to update condo records.' using errcode = '42501';
  end if;
  if p_status not in ('open', 'monitor', 'complete', 'not_applicable', 'unknown') then
    raise exception 'Invalid condition: %', p_status using errcode = '22023';
  end if;
  if not exists (select 1 from public.units where id = p_unit_id and is_active = true) then
    raise exception 'Condo not found.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.item_types where id = p_item_type_id and is_active = true) then
    raise exception 'Active category not found.' using errcode = 'P0002';
  end if;

  insert into public.unit_items (
    unit_id, item_type_id, status, completed_date, last_completed_date, notes, updated_by
  ) values (
    p_unit_id, p_item_type_id, p_status, p_last_completed_date, p_last_completed_date,
    nullif(trim(p_notes), ''), auth.uid()
  )
  on conflict (unit_id, item_type_id)
  do update set
    status = excluded.status,
    completed_date = excluded.last_completed_date,
    last_completed_date = excluded.last_completed_date,
    notes = excluded.notes,
    updated_by = auth.uid()
  returning * into v_result;
  return v_result;
end;
$$;

revoke all on function public.set_unit_item_condition(uuid, uuid, text, date, text) from public, anon;
grant execute on function public.set_unit_item_condition(uuid, uuid, text, date, text) to authenticated;

update public.item_types set label = 'Association Dues' where slug = 'dues' and label = 'Unpaid dues';
update public.item_types set label = 'Exterior Paint' where slug = 'paint' and label = 'Needs paint';
update public.item_types set label = 'Paperwork' where slug = 'paperwork' and label = 'Missing paperwork';
update public.item_types set label = 'Insurance' where slug = 'insurance' and label = 'Insurance needed';
update public.item_types set label = 'Inspection' where slug = 'inspection' and label = 'Inspection needed';
update public.item_types set label = 'Maintenance' where slug = 'maintenance' and label = 'Maintenance item';
