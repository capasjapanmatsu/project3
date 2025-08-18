-- Allow multi-account linking for LINE notifications
-- 1) Add app_user_id column if missing
alter table if exists public.user_line_link
  add column if not exists app_user_id uuid;

-- 2) Ensure there is a stable primary key column `id`
--    (existing tables created earlier may not have it)
alter table if exists public.user_line_link
  add column if not exists id uuid;

update public.user_line_link set id = gen_random_uuid() where id is null;

alter table if exists public.user_line_link
  alter column id set not null;

do $$ begin
  -- Drop old primary key on line_user_id if it exists
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'user_line_link'
      and constraint_type = 'PRIMARY KEY'
  ) then
    begin
      alter table public.user_line_link drop constraint if exists user_line_link_pkey;
    exception when undefined_object then
      null;
    end;
  end if;
end $$;

-- Set primary key to `id`
alter table if exists public.user_line_link
  add primary key (id);

-- 3) Create unique pair for mapping (line_user_id, app_user_id)
do $$ begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'uq_user_line_link_pair'
  ) then
    create unique index uq_user_line_link_pair on public.user_line_link(line_user_id, app_user_id);
  end if;
end $$;

-- 4) Make sure PostgREST reloads the schema
NOTIFY pgrst, 'reload schema';


