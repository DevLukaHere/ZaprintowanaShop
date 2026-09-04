-- P11+P12: składanie zamówienia obsługuje sposób dostawy, formę płatności,
-- kupon rabatowy i zgody wymagane przy sprzedaży na odległość.
alter table public.orders
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists withdrawal_waiver_accepted_at timestamptz;

comment on column public.orders.terms_accepted_at is
  'Moment akceptacji Regulaminu i Polityki prywatności w formularzu zamówienia — dowód spełnienia obowiązku informacyjnego.';
comment on column public.orders.withdrawal_waiver_accepted_at is
  'Moment przyjęcia do wiadomości, że produkt personalizowany nie podlega zwrotowi (art. 38 ust. 1 pkt 3 ustawy o prawach konsumenta).';

drop function if exists public.create_order(text, text, text, text, text, text, text, jsonb);

/*
 * Nowe parametry mają wartości domyślne, więc stare wywołanie z ośmioma argumentami
 * dalej działa — wdrożony frontend nie przestaje działać między migracją a deployem.
 *
 * Ceny produktów liczy klient (tak jak dotąd), ale koszt dostawy i wysokość rabatu
 * biorą się z bazy: metoda dostawy z tabeli, kupon z check_coupon(). Podmiana ceny
 * w przeglądarce nie zmieni więc ani wysyłki, ani rabatu.
 */
create or replace function public.create_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address text,
  p_shipping_city text,
  p_shipping_postcode text,
  p_notes text,
  p_items jsonb,
  p_shipping_method_code text default null,
  p_payment_method text default 'transfer',
  p_shipping_point text default null,
  p_coupon_code text default null,
  p_items_subtotal numeric default null,
  p_terms_accepted boolean default false,
  p_withdrawal_waiver boolean default false
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order_id uuid;
  v_method public.shipping_methods%rowtype;
  v_shipping numeric := 0;
  v_cod numeric := 0;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_coupon jsonb;
  v_coupon_kind text;
  v_coupon_code text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  if p_payment_method not in ('transfer', 'cod') then
    raise exception 'Unknown payment method %', p_payment_method;
  end if;

  if p_shipping_method_code is not null then
    select * into v_method
    from public.shipping_methods
    where code = p_shipping_method_code and active;

    if not found then
      raise exception 'Unknown shipping method %', p_shipping_method_code;
    end if;
    if v_method.requires_point and coalesce(trim(p_shipping_point), '') = '' then
      raise exception 'Shipping method % requires a pickup point', p_shipping_method_code;
    end if;
    if p_payment_method = 'cod' and v_method.cod_surcharge is null then
      raise exception 'Cash on delivery is not available for %', p_shipping_method_code;
    end if;

    v_shipping := v_method.price;
    v_cod := case when p_payment_method = 'cod' then coalesce(v_method.cod_surcharge, 0) else 0 end;
  end if;

  insert into public.orders (
    customer_name, customer_email, customer_phone,
    shipping_address, shipping_city, shipping_postcode, notes,
    shipping_method_code, shipping_method_name, shipping_point, payment_method,
    terms_accepted_at, withdrawal_waiver_accepted_at
  )
  values (
    p_customer_name, p_customer_email, nullif(p_customer_phone, ''),
    p_shipping_address, p_shipping_city, p_shipping_postcode, nullif(p_notes, ''),
    v_method.code, v_method.name, nullif(trim(coalesce(p_shipping_point, '')), ''), p_payment_method,
    case when p_terms_accepted then now() end,
    case when p_withdrawal_waiver then now() end
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

  -- Klient przysyła wartość koszyka po rabatach ilościowych (próbki mają własny cennik,
  -- więc nie da się jej odtworzyć z samych pozycji). Gdyby jej nie przysłał — liczymy wprost.
  v_subtotal := coalesce(
    p_items_subtotal,
    (
      select sum(quantity * coalesce(unit_price, product_price))
      from public.order_items
      where order_id = v_order_id
    )
  );

  if coalesce(trim(p_coupon_code), '') <> '' then
    v_coupon := public.check_coupon(p_coupon_code, v_subtotal);

    if v_coupon ->> 'state' <> 'ok' then
      raise exception 'Coupon rejected: %', v_coupon ->> 'state';
    end if;

    v_coupon_code := v_coupon ->> 'code';
    v_coupon_kind := v_coupon ->> 'kind';
    v_discount := coalesce((v_coupon ->> 'discount')::numeric, 0);

    -- Warunek na limicie użyć zamyka wyścig dwóch zamówień o ostatnie wolne użycie.
    update public.discount_coupons
    set used_count = used_count + 1
    where upper(code) = upper(v_coupon_code)
      and (max_uses is null or used_count < max_uses);

    if not found then
      raise exception 'Coupon rejected: used_up';
    end if;
  end if;

  if v_coupon_kind = 'free_shipping'
     or (v_method.free_from is not null and v_subtotal >= v_method.free_from) then
    v_shipping := 0;
  end if;

  update public.orders
  set items_subtotal = v_subtotal,
      coupon_code = v_coupon_code,
      discount_amount = v_discount,
      -- Dopłata za pobranie zostaje nawet przy darmowej dostawie — to koszt formy płatności.
      shipping_cost = v_shipping + v_cod,
      total_amount = greatest(0, v_subtotal - v_discount) + v_shipping + v_cod
  where id = v_order_id;

  return v_order_id;
end;
$function$;
