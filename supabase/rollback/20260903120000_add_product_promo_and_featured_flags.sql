alter table public.products
  drop column if exists is_promo,
  drop column if exists is_featured;
