-- Fix cancel_order ambiguous parameter/column names and keep signature unchanged
-- Run this in Supabase SQL editor (production) or via CLI.

create or replace function public.can_cancel_order(order_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = public.can_cancel_order.order_id;
  if not found then return false; end if;
  if v_order.status not in ('pending','confirmed') then return false; end if;
  if v_order.cancellable_until is null or v_order.cancellable_until < now() then return false; end if;
  return true;
end $$;

create or replace function public.cancel_order(order_id uuid, user_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders;
  v_item record;
begin
  -- Fetch order
  select * into v_order from public.orders where id = public.cancel_order.order_id;
  if not found then
    return jsonb_build_object('success', false, 'message', 'Order not found');
  end if;

  -- Ownership check
  if v_order.user_id <> public.cancel_order.user_id then
    return jsonb_build_object('success', false, 'message', 'You do not have permission to cancel this order');
  end if;

  -- Cancellable window/state check
  if not public.can_cancel_order(public.cancel_order.order_id) then
    return jsonb_build_object('success', false, 'message', 'This order cannot be cancelled');
  end if;

  -- Restore inventory
  for v_item in select * from public.order_items where order_id = public.cancel_order.order_id loop
    update public.products
      set stock_quantity = stock_quantity + v_item.quantity
      where id = v_item.product_id;
  end loop;

  -- Mark order cancelled
  update public.orders
     set status = 'cancelled',
         payment_status = 'cancelled',
         updated_at = now()
   where id = public.cancel_order.order_id;

  return jsonb_build_object('success', true, 'message', 'Order cancelled');
end $$;


