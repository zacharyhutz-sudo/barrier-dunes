-- Run once in Supabase SQL Editor after deploying the July 2026 admin patch.
-- This migration is safe to re-run.

-- Ensure every active unit has an explicit record for every active item type.
insert into public.unit_items (unit_id, item_type_id, status)
select u.id, i.id, 'unknown'
from public.units u
cross join public.item_types i
where u.is_active = true
  and i.is_active = true
on conflict (unit_id, item_type_id) do nothing;

-- Automatically initialize status records for future units.
create or replace function public.initialize_unit_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.unit_items (unit_id, item_type_id, status)
  select new.id, i.id, 'unknown'
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

-- Automatically create an inactive viewer profile when an Auth user is created.
-- A president still needs to activate the profile and assign the appropriate role.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, email, role, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.email,
    'viewer',
    false
  )
  on conflict (user_id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();
