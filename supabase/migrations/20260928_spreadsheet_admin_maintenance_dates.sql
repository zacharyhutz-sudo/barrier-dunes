-- Barrier Dunes spreadsheet-first admin upgrade.
-- Adds persistent maintenance dates, a Monitor condition, optional owner/contact fields,
-- and a simplified write RPC used by the board-facing admin workspace.
-- Safe to run more than once in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- Optional owner/contact fields used by the simplified condo drawer.
alter table public.units
  add column if not exists owner_name text,
  add column if not exists owner_email text,
  add column if not exists owner_phone text;

-- Keep the most recent known work/completion date independently from current condition.
-- This lets a unit be "Needs attention" while still showing, for example, "Painted May 14, 2019".
alter table public.unit_items
  add column if not exists last_completed_date date;

update public.unit_items
set last_completed_date = completed_date
where last_completed_date is null
  and completed_date is not null;

-- Add a middle "Monitor" condition while preserving existing status values.
alter table public.unit_items
  drop constraint if exists unit_items_status_check;

alter table public.unit_items
  add constraint unit_items_status_check
  check (status in ('open', 'monitor', 'complete', 'not_applicable', 'unknown'));

-- Store the maintenance-date snapshot on each immutable event as well.
alter table public.unit_item_events
  add column if not exists last_completed_date date;

update public.unit_item_events
set last_completed_date = completed_date
where last_completed_date is null
  and completed_date is not null;

alter table public.unit_item_events
  drop constraint if exists unit_item_events_event_type_check;

alter table public.unit_item_events
  add constraint unit_item_events_event_type_check
  check (event_type in (
    'initialized',
    'opened',
    'resolved',
    'reopened',
    'updated',
    'note_added',
    'work_recorded'
  ));

-- Rebuild the event trigger so maintenance dates remain meaningful even when
-- current condition is Monitor or Needs attention.
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
    old.last_completed_date,
    old.due_date,
    old.period_label,
    old.notes
  ) is not distinct from row(
    new.status,
    new.last_completed_date,
    new.due_date,
    new.period_label,
    new.notes
  ) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_event_type := 'initialized';
  elsif new.last_completed_date is distinct from old.last_completed_date
    and new.last_completed_date is not null then
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
    unit_item_id,
    unit_id,
    item_type_id,
    event_type,
    event_date,
    previous_status,
    new_status,
    completed_date,
    last_completed_date,
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
    coalesce(new.last_completed_date, new.completed_date),
    new.last_completed_date,
    new.due_date,
    new.period_label,
    new.notes,
    new.updated_by,
    coalesce(new.updated_by_name, 'System')
  );

  return new;
end;
$$;

-- One intentionally small RPC powers the spreadsheet/drawer condition editor.
-- last_completed_date is independent of status, so historical work dates are never
-- erased just because a condo later needs attention again.
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
    unit_id,
    item_type_id,
    status,
    completed_date,
    last_completed_date,
    notes,
    updated_by
  ) values (
    p_unit_id,
    p_item_type_id,
    p_status,
    p_last_completed_date,
    p_last_completed_date,
    nullif(trim(p_notes), ''),
    auth.uid()
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

-- Make the starter categories read naturally as spreadsheet columns. Custom categories are untouched.
update public.item_types set label = 'Association Dues' where slug = 'dues' and label = 'Unpaid dues';
update public.item_types set label = 'Exterior Paint' where slug = 'paint' and label = 'Needs paint';
update public.item_types set label = 'Paperwork' where slug = 'paperwork' and label = 'Missing paperwork';
update public.item_types set label = 'Insurance' where slug = 'insurance' and label = 'Insurance needed';
update public.item_types set label = 'Inspection' where slug = 'inspection' and label = 'Inspection needed';
update public.item_types set label = 'Maintenance' where slug = 'maintenance' and label = 'Maintenance item';

-- Realtime already includes units/unit_items/unit_item_events in the previous migration.
