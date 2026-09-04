-- Przywraca poprzednią wersję create_order (bez dostawy i kuponów).
drop function if exists public.create_order(
  text, text, text, text, text, text, text, jsonb, text, text, text, text, numeric, boolean, boolean
);

alter table public.orders
  drop column if exists terms_accepted_at,
  drop column if exists withdrawal_waiver_accepted_at;

create or replace function public.create_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address text,
  p_shipping_city text,
  p_shipping_postcode text,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order_id uuid;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  insert into public.orders (
    customer_name, customer_email, customer_phone,
    shipping_address, shipping_city, shipping_postcode, notes
  )
  values (
    p_customer_name, p_customer_email, nullif(p_customer_phone, ''),
    p_shipping_address, p_shipping_city, p_shipping_postcode, nullif(p_notes, '')
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, product_id, product_name, product_price,
    quantity, unit_price, mode, configuration
  )
  select
    v_order_id, p.id, p.name, p.price,
    greatest(1, (item ->> 'quantity')::int),
    coalesce((item ->> 'unit_price')::numeric, p.price),
    coalesce(nullif(item ->> 'mode', ''), 'standard'),
    item -> 'configuration'
  from jsonb_array_elements(p_items) as item
  join public.products p on p.id::text = item ->> 'product_id';

  if not exists (select 1 from public.order_items where order_id = v_order_id) then
    raise exception 'None of the ordered products exist';
  end if;

  return v_order_id;
end;
$function$;
