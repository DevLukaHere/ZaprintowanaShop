-- Nowy przepływ danych do zaproszeń:
-- zamówienie → opłacenie → mail z linkiem do formularza → dane wracają do panelu.
-- Formularz znika z checkoutu; zamówienie powstaje bez danych uroczystości.
alter table public.orders
  add column if not exists personalisation_token uuid not null default gen_random_uuid(),
  add column if not exists personalisation_submitted_at timestamptz,
  add column if not exists order_placed_email_sent_at timestamptz,
  add column if not exists payment_email_sent_at timestamptz;

create unique index if not exists orders_personalisation_token_idx
  on public.orders (personalisation_token);

comment on column public.orders.personalisation_token is
  'Sekret w linku do formularza z danymi do zaproszeń. Klient dostaje go mailem po opłaceniu zamówienia.';

drop function if exists public.create_order(text, text, text, text, text, text, text, jsonb, jsonb);

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
    v_order_id,
    p.id,
    p.name,
    p.price,
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

-- Odczyt zamówienia po tokenie z linku. Zwraca tylko to, co potrzebne w formularzu,
-- i tylko dla zamówień opłaconych. Bez tokenu nie da się dotrzeć do danych klienta.
create or replace function public.get_order_details_form(p_token uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path to 'public'
as $function$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where personalisation_token = p_token;

  if not found then
    return jsonb_build_object('state', 'not_found');
  end if;

  if v_order.payment_status <> 'paid' then
    return jsonb_build_object('state', 'not_paid');
  end if;

  if v_order.status = 'cancelled' then
    return jsonb_build_object('state', 'cancelled');
  end if;

  return jsonb_build_object(
    'state', 'ready',
    'order_id', v_order.id,
    'customer_name', v_order.customer_name,
    'created_at', v_order.created_at,
    'locked', v_order.status = 'done',
    'submitted_at', v_order.personalisation_submitted_at,
    'personalisation', coalesce(v_order.personalisation, '{}'::jsonb),
    'items', coalesce(
      (
        select jsonb_agg(jsonb_build_object('name', i.product_name, 'quantity', i.quantity)
                         order by i.id)
        from public.order_items i
        where i.order_id = v_order.id
      ),
      '[]'::jsonb
    )
  );
end;
$function$;

-- Zapis danych z formularza. Klient może poprawiać je aż do zamknięcia zamówienia.
create or replace function public.save_order_details(p_token uuid, p_personalisation jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order public.orders%rowtype;
begin
  if p_personalisation is null or jsonb_typeof(p_personalisation) <> 'object' then
    raise exception 'Personalisation must be a JSON object';
  end if;

  if length(p_personalisation::text) > 8000 then
    raise exception 'Personalisation payload too large';
  end if;

  select * into v_order from public.orders where personalisation_token = p_token;

  if not found then
    return jsonb_build_object('state', 'not_found');
  end if;
  if v_order.payment_status <> 'paid' then
    return jsonb_build_object('state', 'not_paid');
  end if;
  if v_order.status in ('done', 'cancelled') then
    return jsonb_build_object('state', 'locked');
  end if;

  update public.orders
  set personalisation = p_personalisation,
      personalisation_submitted_at = now()
  where id = v_order.id;

  return jsonb_build_object('state', 'saved');
end;
$function$;
