-- P5: zakładki nad karuzelą na stronie głównej (Promocje / Popularne / Polecane / Nowości).
-- „Popularne” korzysta z istniejącej flagi is_bestseller, „Nowości” z is_new.
alter table public.products
  add column if not exists is_promo boolean not null default false,
  add column if not exists is_featured boolean not null default false;

comment on column public.products.is_promo is 'Produkt pokazywany w zakładce „Promocje” karuzeli na stronie głównej.';
comment on column public.products.is_featured is 'Produkt pokazywany w zakładce „Polecane” karuzeli na stronie głównej.';
