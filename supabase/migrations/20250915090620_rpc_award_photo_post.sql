-- RPC to award 10 points for photo post (once per photo)
create or replace function public.rpc_award_photo_post(p_user uuid, p_photo_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_exists boolean; begin
  select exists (
    select 1 from public.points_ledger
    where user_id = p_user and source = 'photo_post' and reference_id = p_photo_id::text
  ) into v_exists;
  if v_exists then return 'already_awarded'; end if;
  perform public.fn_add_points(p_user, 10, 'earn', 'photo_post', '写真投稿(+10P)', 'photo_post', p_photo_id::text);
  return 'success';
end $$;


