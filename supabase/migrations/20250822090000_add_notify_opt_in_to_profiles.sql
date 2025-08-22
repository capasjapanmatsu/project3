-- Add notify_opt_in flag to profiles for LINE/app notifications
-- Safe to run multiple times

alter table if exists public.profiles
  add column if not exists notify_opt_in boolean not null default false;

-- Optional: backfill nulls to false (in case column existed without default)
update public.profiles set notify_opt_in = false where notify_opt_in is null;

-- (Optional) comment for documentation
comment on column public.profiles.notify_opt_in is 'When true, the user allows app/LINE notifications.';


