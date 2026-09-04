-- P11: sposób dostawy wybierany przy składaniu zamówienia.
-- Metody trzyma baza, nie kod — właściciel sklepu zmienia ceny i włącza/wyłącza
-- przewoźników w panelu, tak samo jak słowniki kategorii.
create table if not exists public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  carrier text not null,
  description text,
  price numeric not null default 0 check (price >= 0),
  -- null = ta metoda nigdy nie jest darmowa; liczba = próg wartości koszyka, od którego jest gratis
  free_from numeric check (free_from >= 0),
  -- null = pobranie niedostępne; 0 = dostępne bez dopłaty
  cod_surcharge numeric check (cod_surcharge >= 0),
  requires_point boolean not null default false,
  point_hint text,
  lead_time text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column public.shipping_methods.free_from is
  'Próg wartości produktów, od którego dostawa jest gratis. NULL = metoda zawsze płatna.';
comment on column public.shipping_methods.cod_surcharge is
  'Dopłata za płatność przy odbiorze. NULL = pobranie dla tej metody niedostępne, 0 = bez dopłaty.';
comment on column public.shipping_methods.requires_point is
  'Metoda wymaga wskazania punktu odbioru (paczkomat, punkt Orlen, ParcelShop).';

alter table public.shipping_methods enable row level security;

-- Klient widzi tylko metody włączone; panel widzi wszystkie, także wyłączone.
drop policy if exists "Anyone reads active shipping methods" on public.shipping_methods;
create policy "Anyone reads active shipping methods"
  on public.shipping_methods for select
  to anon, authenticated
  using (active or is_admin());

drop policy if exists "Admins insert shipping methods" on public.shipping_methods;
create policy "Admins insert shipping methods"
  on public.shipping_methods for insert to authenticated with check (is_admin());

drop policy if exists "Admins update shipping methods" on public.shipping_methods;
create policy "Admins update shipping methods"
  on public.shipping_methods for update to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "Admins delete shipping methods" on public.shipping_methods;
create policy "Admins delete shipping methods"
  on public.shipping_methods for delete to authenticated using (is_admin());

create index if not exists shipping_methods_sort_idx
  on public.shipping_methods (sort_order, name);

-- Zestaw startowy: najpopularniejsi przewoźnicy w polskim e-commerce.
-- Ceny są orientacyjne — do poprawienia w panelu po ustaleniu cennika z przewoźnikiem.
insert into public.shipping_methods
  (code, name, carrier, description, price, free_from, cod_surcharge, requires_point, point_hint, lead_time, sort_order)
values
  ('inpost-locker', 'Paczkomat InPost 24/7', 'InPost',
   'Odbiór o dowolnej porze z automatu paczkowego.', 14.99, 500, 5, true,
   'Podaj kod paczkomatu, np. WAW01A', '1–2 dni robocze', 10),
  ('orlen-parcel', 'Orlen Paczka', 'Orlen',
   'Odbiór w punkcie Orlen Paczka lub automacie.', 10.99, 500, 6, true,
   'Podaj adres lub numer punktu Orlen Paczka', '1–3 dni robocze', 20),
  ('inpost-courier', 'Kurier InPost', 'InPost',
   'Doręczenie pod wskazany adres.', 18.99, 500, 7, false,
   null, '1–2 dni robocze', 30),
  ('dpd-courier', 'Kurier DPD', 'DPD',
   'Doręczenie pod wskazany adres, powiadomienia SMS o dostawie.', 19.99, 500, 7, false,
   null, '1–2 dni robocze', 40),
  ('poczta-pocztex', 'Poczta Polska — Pocztex Kurier', 'Poczta Polska',
   'Doręczenie pod adres, z awizo i odbiorem w placówce.', 15.99, 500, 7, false,
   null, '2–3 dni robocze', 50),
  ('poczta-registered', 'Poczta Polska — list polecony', 'Poczta Polska',
   'Najtańsza opcja dla próbek i pojedynczych kartek.', 9.90, 500, null, false,
   null, '2–5 dni roboczych', 60),
  ('personal-pickup', 'Odbiór osobisty', 'Zaprintowana',
   'Odbiór po wcześniejszym umówieniu terminu — bez kosztów dostawy.', 0, null, 0, false,
   null, 'po umówieniu', 70)
on conflict (code) do nothing;

-- Zamówienie zapamiętuje wybraną metodę razem z ceną i nazwą z chwili zakupu —
-- późniejsza zmiana cennika nie może przepisać historii.
alter table public.orders
  add column if not exists shipping_method_code text,
  add column if not exists shipping_method_name text,
  add column if not exists shipping_cost numeric not null default 0,
  add column if not exists shipping_point text,
  add column if not exists payment_method text not null default 'transfer';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_payment_method_check'
  ) then
    alter table public.orders
      add constraint orders_payment_method_check
      check (payment_method in ('transfer', 'cod'));
  end if;
end $$;

comment on column public.orders.shipping_method_name is
  'Nazwa metody dostawy zapisana w chwili zakupu — odporna na późniejsze zmiany w cenniku.';
comment on column public.orders.shipping_point is
  'Paczkomat lub punkt odbioru wskazany przez klienta.';
comment on column public.orders.payment_method is
  'transfer = przelew z góry, cod = płatność przy odbiorze (pobranie).';
