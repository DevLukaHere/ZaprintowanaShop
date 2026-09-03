/**
 * Kategorie, style i rodzaje są redagowane w panelu i trzymane w tabeli `taxonomy`.
 * Stałe poniżej są wyłącznie wartościami startowymi: pokazujemy je, zanim tabela
 * się wczyta, i z nich seedowana była baza. Danymi produkcyjnymi zarządza
 * `TaxonomyService`.
 */

/** Slug kategorii głównej. Nie jest już zamkniętą listą — admin może dodać kolejne. */
export type MainCategory = string;

export interface CategoryLink {
  slug: string;
  label: string;
}

export interface MainCategoryDef extends CategoryLink {
  slug: MainCategory;
  subcategories: CategoryLink[];
  filterable: boolean;
}

export const PRODUCT_STYLES_SEED: readonly CategoryLink[] = [
  { slug: 'floral', label: 'Kwiatowe' },
  { slug: 'glamour', label: 'Glamour' },
  { slug: 'boho', label: 'Boho' },
  { slug: 'minimalist', label: 'Minimalistyczne' },
];

export const PRODUCT_TYPES_SEED: readonly CategoryLink[] = [
  { slug: 'gilded', label: 'Złocone' },
  { slug: 'with-photo', label: 'Ze zdjęciem' },
  { slug: 'single-card', label: 'Jednokartkowe' },
  { slug: 'modern', label: 'Nowoczesne' },
  { slug: 'elegant', label: 'Eleganckie' },
  { slug: 'for-parents', label: 'Dla rodziców' },
];

export const MAIN_CATEGORIES_SEED: readonly MainCategoryDef[] = [
  {
    slug: 'invitations',
    label: 'Zaproszenia',
    filterable: true,
    subcategories: [
      { slug: 'new', label: 'Nowości' },
      { slug: 'bestsellers', label: 'Bestsellery' },
    ],
  },
  {
    slug: 'extras',
    label: 'Dodatki',
    filterable: true,
    subcategories: [
      { slug: 'place-cards', label: 'Winietki' },
      { slug: 'menu', label: 'Menu' },
      { slug: 'table-numbers', label: 'Nr stołów' },
      { slug: 'scratch-cards', label: 'Zdrapki' },
      { slug: 'bottle-tags', label: 'Zawieszki na alkohol' },
      { slug: 'signs', label: 'Tablice' },
      { slug: 'seating-chart', label: 'Plan stołów' },
      { slug: 'thank-you-cards', label: 'Podziękowania' },
    ],
  },
  { slug: 'custom-order', label: 'Zamówienie indywidualne', filterable: false, subcategories: [] },
  { slug: 'reprint', label: 'Dodruk', filterable: false, subcategories: [] },
];

/**
 * Podkategorie wyliczane z flag produktu (`is_new`, `is_bestseller`), a nie z pola
 * `subcategory`. To powiązanie siedzi w kolumnach tabeli `products`, więc zostaje w kodzie.
 */
export const FLAG_SUBCATEGORIES = ['new', 'bestsellers'] as const;
export type FlagSubcategory = (typeof FLAG_SUBCATEGORIES)[number];

export function isFlagSubcategory(slug: string): slug is FlagSubcategory {
  return (FLAG_SUBCATEGORIES as readonly string[]).includes(slug);
}

export function findMainCategoryIn(
  categories: readonly MainCategoryDef[],
  slug: string | undefined,
): MainCategoryDef | undefined {
  return categories.find((category) => category.slug === slug);
}

export function subcategoryLabelIn(
  categories: readonly MainCategoryDef[],
  main: string | undefined,
  sub: string | undefined,
): string {
  if (!sub) {
    return '';
  }
  const fromMain = findMainCategoryIn(categories, main)?.subcategories.find(
    (entry) => entry.slug === sub,
  );
  if (fromMain) {
    return fromMain.label;
  }
  const anywhere = categories
    .flatMap((category) => category.subcategories)
    .find((entry) => entry.slug === sub);
  return anywhere?.label ?? sub;
}

export function labelIn(entries: readonly CategoryLink[], slug: string): string {
  return entries.find((entry) => entry.slug === slug)?.label ?? slug;
}

/** Slug z etykiety: „Nr stołów” → „nr-stolow”. */
export function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/\u0142/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
