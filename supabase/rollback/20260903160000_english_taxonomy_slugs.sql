-- Powrót do polskich slugów (odwrotne mapowanie).
do $$
declare
  slug_map constant jsonb := jsonb_build_object(
    'invitations','zaproszenia', 'extras','dodatki', 'custom-order','indywidualne',
    'reprint','dodruk', 'new','nowosci', 'bestsellers','bestsellery',
    'place-cards','winietki', 'table-numbers','nr-stolow', 'scratch-cards','zdrapki',
    'bottle-tags','zawieszki-na-alkohol', 'signs','tablice', 'seating-chart','plan-stolow',
    'thank-you-cards','podziekowania', 'floral','kwiatowe', 'minimalist','minimalistyczne',
    'gilded','zlocone', 'with-photo','ze-zdjeciem', 'single-card','jednokartkowe',
    'modern','nowoczesne', 'elegant','eleganckie', 'for-parents','dla-rodzicow'
  );
begin
  update public.taxonomy
  set slug = coalesce(slug_map ->> slug, slug),
      parent_slug = coalesce(slug_map ->> parent_slug, parent_slug);
  update public.products
  set category = coalesce(slug_map ->> category, category),
      subcategory = coalesce(slug_map ->> subcategory, subcategory);
  update public.products p set styles = (
    select coalesce(array_agg(coalesce(slug_map ->> s, s) order by ord), '{}')
    from unnest(p.styles) with ordinality as u(s, ord))
  where p.styles is not null and array_length(p.styles, 1) > 0;
  update public.products p set types = (
    select coalesce(array_agg(coalesce(slug_map ->> t, t) order by ord), '{}')
    from unnest(p.types) with ordinality as u(t, ord))
  where p.types is not null and array_length(p.types, 1) > 0;
end $$;
