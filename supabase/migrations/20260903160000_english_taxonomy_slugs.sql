-- Slugi trafiają do adresów URL, więc przechodzą na angielski.
-- Etykiety (`label`) zostają po polsku — to treść strony, nie warstwa techniczna.
do $$
declare
  slug_map constant jsonb := jsonb_build_object(
    -- kategorie
    'zaproszenia',          'invitations',
    'dodatki',              'extras',
    'indywidualne',         'custom-order',
    'dodruk',               'reprint',
    -- podkategorie wyliczane z flag produktu
    'nowosci',              'new',
    'bestsellery',          'bestsellers',
    -- podkategorie dodatków
    'winietki',             'place-cards',
    'nr-stolow',            'table-numbers',
    'zdrapki',              'scratch-cards',
    'zawieszki-na-alkohol', 'bottle-tags',
    'tablice',              'signs',
    'plan-stolow',          'seating-chart',
    'podziekowania',        'thank-you-cards',
    -- style
    'kwiatowe',             'floral',
    'minimalistyczne',      'minimalist',
    -- rodzaje
    'zlocone',              'gilded',
    'ze-zdjeciem',          'with-photo',
    'jednokartkowe',        'single-card',
    'nowoczesne',           'modern',
    'eleganckie',           'elegant',
    'dla-rodzicow',         'for-parents'
  );
begin
  -- „menu”, „glamour” i „boho” są już angielskie i zostają bez zmian.

  update public.taxonomy
  set slug = coalesce(slug_map ->> slug, slug),
      parent_slug = coalesce(slug_map ->> parent_slug, parent_slug);

  update public.products
  set category = coalesce(slug_map ->> category, category),
      subcategory = coalesce(slug_map ->> subcategory, subcategory);

  update public.products p
  set styles = (
        select coalesce(array_agg(coalesce(slug_map ->> s, s) order by ord), '{}')
        from unnest(p.styles) with ordinality as u(s, ord)
      )
  where p.styles is not null and array_length(p.styles, 1) > 0;

  update public.products p
  set types = (
        select coalesce(array_agg(coalesce(slug_map ->> t, t) order by ord), '{}')
        from unnest(p.types) with ordinality as u(t, ord)
      )
  where p.types is not null and array_length(p.types, 1) > 0;
end $$;
