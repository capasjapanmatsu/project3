-- Fix FK: facility_reservations.user_id should reference profiles(id)
alter table if exists public.facility_reservations
  drop constraint if exists facility_reservations_user_id_fkey;

alter table public.facility_reservations
  add constraint facility_reservations_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete restrict;


