-- Definitive fix: stop referencing function name as qualifier; use args directly

create or replace function public.can_cancel_order(order_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_order public.orders; begin
  select * into v_order from public.orders where id = order_id;
  if not found then return false; end if;
  if v_order.status not in ('pending','confirmed') then return false; end if;
  if v_order.cancellable_until is null or v_order.cancellable_until < now() then return false; end if;
  return true;
end $$;

create or replace function public.cancel_order(order_id uuid, user_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_order public.orders; v_item record; begin
  select * into v_order from public.orders where id = order_id;
  if not found then
    return jsonb_build_object('success', false, 'message', 'Order not found');
  end if;
  if v_order.user_id <> user_id then
    return jsonb_build_object('success', false, 'message', 'You do not have permission to cancel this order');
  end if;
  if not can_cancel_order(order_id) then
    return jsonb_build_object('success', false, 'message', 'This order cannot be cancelled');
  end if;
  for v_item in select * from public.order_items where order_id = order_id loop
    update public.products set stock_quantity = stock_quantity + v_item.quantity where id = v_item.product_id;
  end loop;
  update public.orders
     set status = 'cancelled', payment_status = 'cancelled', updated_at = now()
   where id = order_id;
  return jsonb_build_object('success', true, 'message', 'Order cancelled');
end $$;

grant execute on function public.cancel_order(uuid, uuid) to authenticated;
grant execute on function public.can_cancel_order(uuid) to authenticated;


