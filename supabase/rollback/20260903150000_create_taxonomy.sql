drop table if exists public.taxonomy;

-- Przywrócenie zamkniętej listy kategorii produktu.
alter table public.products
  add constraint products_category_check
  check (category = any (array['zaproszenia', 'dodatki', 'indywidualne', 'dodruk']));
