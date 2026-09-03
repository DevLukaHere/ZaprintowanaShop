-- P10: kategorie, style i rodzaje przestają być stałymi w kodzie — od teraz
-- redaguje je administrator w panelu. models/category.ts zostaje tylko jako
-- wartości startowe używane, zanim tabela się wczyta.
create table if not exists public.taxonomy (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('category', 'subcategory', 'style', 'type')),
  slug text not null,
  label text not null,
  parent_slug text,
  sort_order integer not null default 0,
  filterable boolean not null default true,
  is_flag boolean not null default false,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  constraint taxonomy_subcategory_has_parent
    check ((kind = 'subcategory') = (parent_slug is not null))
);

create unique index if not exists taxonomy_kind_parent_slug_idx
  on public.taxonomy (kind, coalesce(parent_slug, ''), slug);

alter table public.taxonomy enable row level security;

drop policy if exists "Enable read access for all users" on public.taxonomy;
create policy "Enable read access for all users"
  on public.taxonomy for select to public using (true);

drop policy if exists "Admins can insert taxonomy" on public.taxonomy;
create policy "Admins can insert taxonomy"
  on public.taxonomy for insert to authenticated with check (is_admin());

drop policy if exists "Admins can update taxonomy" on public.taxonomy;
create policy "Admins can update taxonomy"
  on public.taxonomy for update to authenticated using (is_admin()) with check (is_admin());

-- Wpisów systemowych (4 główne kategorie, Nowości, Bestsellery) nie da się usunąć —
-- wiszą na nich trasy i flagi produktu.
drop policy if exists "Admins can delete taxonomy" on public.taxonomy;
create policy "Admins can delete taxonomy"
  on public.taxonomy for delete to authenticated using (is_admin() and not is_system);

-- Kategoria produktu przestaje być zamkniętą listą — od teraz pilnuje jej tabela taxonomy.
alter table public.products drop constraint if exists products_category_check;

insert into public.taxonomy (kind, slug, label, parent_slug, sort_order, filterable, is_flag, is_system)
values
  ('category', 'zaproszenia', 'Zaproszenia', null, 10, true, false, true),
  ('category', 'dodatki', 'Dodatki', null, 20, true, false, true),
  ('category', 'indywidualne', 'Zamówienie indywidualne', null, 30, false, false, true),
  ('category', 'dodruk', 'Dodruk', null, 40, false, false, true),

  ('subcategory', 'nowosci', 'Nowości', 'zaproszenia', 10, true, true, true),
  ('subcategory', 'bestsellery', 'Bestsellery', 'zaproszenia', 20, true, true, true),

  ('subcategory', 'winietki', 'Winietki', 'dodatki', 10, true, false, false),
  ('subcategory', 'menu', 'Menu', 'dodatki', 20, true, false, false),
  ('subcategory', 'nr-stolow', 'Nr stołów', 'dodatki', 30, true, false, false),
  ('subcategory', 'zdrapki', 'Zdrapki', 'dodatki', 40, true, false, false),
  ('subcategory', 'zawieszki-na-alkohol', 'Zawieszki na alkohol', 'dodatki', 50, true, false, false),
  ('subcategory', 'tablice', 'Tablice', 'dodatki', 60, true, false, false),
  ('subcategory', 'plan-stolow', 'Plan stołów', 'dodatki', 70, true, false, false),
  ('subcategory', 'podziekowania', 'Podziękowania', 'dodatki', 80, true, false, false),

  ('style', 'kwiatowe', 'Kwiatowe', null, 10, true, false, false),
  ('style', 'glamour', 'Glamour', null, 20, true, false, false),
  ('style', 'boho', 'Boho', null, 30, true, false, false),
  ('style', 'minimalistyczne', 'Minimalistyczne', null, 40, true, false, false),

  ('type', 'zlocone', 'Złocone', null, 10, true, false, false),
  ('type', 'ze-zdjeciem', 'Ze zdjęciem', null, 20, true, false, false),
  ('type', 'jednokartkowe', 'Jednokartkowe', null, 30, true, false, false),
  ('type', 'nowoczesne', 'Nowoczesne', null, 40, true, false, false),
  ('type', 'eleganckie', 'Eleganckie', null, 50, true, false, false),
  ('type', 'dla-rodzicow', 'Dla rodziców', null, 60, true, false, false)
on conflict do nothing;
