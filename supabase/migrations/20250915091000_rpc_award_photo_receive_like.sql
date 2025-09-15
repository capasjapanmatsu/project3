-- RPC: いいねされた側(写真のオーナー)に+1P付与。1ユーザーにつき同じ写真では一度だけ。
create or replace function public.rpc_award_photo_receive_like(p_photo_id uuid, p_liker uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_ref text; v_exists boolean; begin
  select user_id into v_owner from public.photo_posts where id = p_photo_id;
  if v_owner is null then return 'photo_not_found'; end if;
  if v_owner = p_liker then return 'skip_self_like'; end if;

  v_ref := p_photo_id::text || ':' || p_liker::text; -- 写真×いいねした人 で一意

  select exists (
    select 1 from public.points_ledger
    where user_id = v_owner and source = 'photo_receive_like' and reference_id = v_ref
  ) into v_exists;
  if v_exists then return 'already_awarded'; end if;

  perform public.fn_add_points(
    v_owner, 1, 'earn', 'photo_receive_like', '写真にいいねを獲得(+1P)', 'photo_receive_like', v_ref
  );
  return 'success';
end $$;

grant execute on function public.rpc_award_photo_receive_like(uuid, uuid) to authenticated;


