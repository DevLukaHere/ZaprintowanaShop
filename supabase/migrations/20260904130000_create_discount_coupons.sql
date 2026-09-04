-- P12: kupony rabatowe zakładane w panelu, wpisywane przez klienta w koszyku.
create table if not exists public.discount_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  kind text not null check (kind in ('percent', 'amount', 'free_shipping')),
  value numeric not null default 0 check (value >= 0),
  min_order_value numeric not null default 0 check (min_order_value >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  active boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  constraint discount_coupons_percent_range check (kind <> 'percent' or value <= 100),
  constraint discount_coupons_dates check (starts_at is null or expires_at is null or expires_at > starts_at)
);

comment on table public.discount_coupons is
  'Kupony rabatowe. Klient nie ma prawa odczytu tej tabeli — sprawdza kod wyłącznie przez check_coupon().';
comment on column public.discount_coupons.kind is
  'percent = rabat procentowy, amount = kwota w zł, free_shipping = darmowa dostawa.';
comment on column public.discount_coupons.max_uses is 'NULL = bez limitu użyć.';

-- Kody porównujemy bez względu na wielkość liter, więc unikalność też jest bez niej.
create unique index if not exists discount_coupons_code_idx
  on public.discount_coupons (upper(code));

alter table public.discount_coupons enable row level security;

-- Żadnego publicznego odczytu: inaczej wystarczyłby anon key, żeby pobrać listę wszystkich kodów.
drop policy if exists "Admins read coupons" on public.discount_coupons;
create policy "Admins read coupons"
  on public.discount_coupons for select to authenticated using (is_admin());

drop policy if exists "Admins insert coupons" on public.discount_coupons;
create policy "Admins insert coupons"
  on public.discount_coupons for insert to authenticated with check (is_admin());

drop policy if exists "Admins update coupons" on public.discount_coupons;
create policy "Admins update coupons"
  on public.discount_coupons for update to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "Admins delete coupons" on public.discount_coupons;
create policy "Admins delete coupons"
  on public.discount_coupons for delete to authenticated using (is_admin());

-- Rabat liczony w jednym miejscu — używa go i sprawdzenie kodu w koszyku, i składanie zamówienia.
create or replace function public.coupon_discount(
  p_kind text,
  p_value numeric,
  p_subtotal numeric
)
returns numeric
language sql
immutable
set search_path to 'public'
as $function$
  select case p_kind
    when 'percent' then round(coalesce(p_subtotal, 0) * p_value / 100, 2)
    when 'amount' then least(coalesce(p_value, 0), coalesce(p_subtotal, 0))
    else 0
  end;
$function$;

/*
 * Sprawdzenie kodu wpisanego w koszyku. Bez tokenu i bez sesji — dlatego
 * odpowiedź zawiera tylko to, co i tak trzeba pokazać klientowi, a nieistniejący
 * kod jest nie do odróżnienia od nieaktywnego.
 */
create or replace function public.check_coupon(p_code text, p_subtotal numeric default 0)
returns jsonb
language plpgsql
security definer
stable
set search_path to 'public'
as $function$
declare
  v_coupon public.discount_coupons%rowtype;
begin
  if p_code is null or length(trim(p_code)) = 0 then
    return jsonb_build_object('state', 'not_found');
  end if;

  select * into v_coupon
  from public.discount_coupons
  where upper(code) = upper(trim(p_code));

  if not found or not v_coupon.active then
    return jsonb_build_object('state', 'not_found');
  end if;
  if v_coupon.starts_at is not null and now() < v_coupon.starts_at then
    return jsonb_build_object('state', 'not_started', 'starts_at', v_coupon.starts_at);
  end if;
  if v_coupon.expires_at is not null and now() > v_coupon.expires_at then
    return jsonb_build_object('state', 'expired');
  end if;
  if v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses then
    return jsonb_build_object('state', 'used_up');
  end if;
  if coalesce(p_subtotal, 0) < v_coupon.min_order_value then
    return jsonb_build_object(
      'state', 'below_minimum',
      'min_order_value', v_coupon.min_order_value
    );
  end if;

  return jsonb_build_object(
    'state', 'ok',
    'code', v_coupon.code,
    'kind', v_coupon.kind,
    'value', v_coupon.value,
    'description', v_coupon.description,
    'min_order_value', v_coupon.min_order_value,
    'discount', public.coupon_discount(v_coupon.kind, v_coupon.value, p_subtotal),
    'free_shipping', v_coupon.kind = 'free_shipping'
  );
end;
$function$;

grant execute on function public.check_coupon(text, numeric) to anon, authenticated;

-- Kwoty zamówienia zapisujemy w chwili zakupu — panel i maile nie muszą ich przeliczać.
alter table public.orders
  add column if not exists items_subtotal numeric not null default 0,
  add column if not exists coupon_code text,
  add column if not exists discount_amount numeric not null default 0,
  add column if not exists total_amount numeric not null default 0;

comment on column public.orders.items_subtotal is
  'Wartość produktów po rabatach ilościowych, przed kuponem i dostawą.';
comment on column public.orders.total_amount is
  'items_subtotal − discount_amount + shipping_cost. Kwota, którą płaci klient.';
