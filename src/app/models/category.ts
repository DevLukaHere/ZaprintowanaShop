export type MainCategory = 'zaproszenia' | 'dodatki' | 'indywidualne' | 'dodruk';

export interface CategoryLink {
  slug: string;
  label: string;
}

export interface MainCategoryDef extends CategoryLink {
  slug: MainCategory;
  subcategories: CategoryLink[];
  filterable: boolean;
}

export const PRODUCT_STYLES: readonly CategoryLink[] = [
  { slug: 'kwiatowe', label: 'Kwiatowe' },
  { slug: 'glamour', label: 'Glamour' },
  { slug: 'boho', label: 'Boho' },
  { slug: 'minimalistyczne', label: 'Minimalistyczne' },
];

export const PRODUCT_TYPES: readonly CategoryLink[] = [
  { slug: 'zlocone', label: 'Złocone' },
  { slug: 'ze-zdjeciem', label: 'Ze zdjęciem' },
  { slug: 'jednokartkowe', label: 'Jednokartkowe' },
  { slug: 'nowoczesne', label: 'Nowoczesne' },
  { slug: 'eleganckie', label: 'Eleganckie' },
  { slug: 'dla-rodzicow', label: 'Dla rodziców' },
];

export const MAIN_CATEGORIES: readonly MainCategoryDef[] = [
  {
    slug: 'zaproszenia',
    label: 'Zaproszenia',
    filterable: true,
    subcategories: [
      { slug: 'nowosci', label: 'Nowości' },
      { slug: 'bestsellery', label: 'Bestsellery' },
    ],
  },
  {
    slug: 'dodatki',
    label: 'Dodatki',
    filterable: true,
    subcategories: [
      { slug: 'winietki', label: 'Winietki' },
      { slug: 'menu', label: 'Menu' },
      { slug: 'nr-stolow', label: 'Nr stołów' },
      { slug: 'zdrapki', label: 'Zdrapki' },
      { slug: 'zawieszki-na-alkohol', label: 'Zawieszki na alkohol' },
      { slug: 'tablice', label: 'Tablice' },
      { slug: 'plan-stolow', label: 'Plan stołów' },
      { slug: 'podziekowania', label: 'Podziękowania' },
    ],
  },
  { slug: 'indywidualne', label: 'Zamówienie indywidualne', filterable: false, subcategories: [] },
  { slug: 'dodruk', label: 'Dodruk', filterable: false, subcategories: [] },
];

export const FLAG_SUBCATEGORIES = ['nowosci', 'bestsellery'] as const;
export type FlagSubcategory = (typeof FLAG_SUBCATEGORIES)[number];

export function isFlagSubcategory(slug: string): slug is FlagSubcategory {
  return (FLAG_SUBCATEGORIES as readonly string[]).includes(slug);
}

export function findMainCategory(slug: string | undefined): MainCategoryDef | undefined {
  return MAIN_CATEGORIES.find((category) => category.slug === slug);
}

export function categoryLabel(slug: string | undefined): string {
  return findMainCategory(slug)?.label ?? '';
}

export function subcategoryLabel(main: string | undefined, sub: string | undefined): string {
  if (!sub) {
    return '';
  }
  const fromMain = findMainCategory(main)?.subcategories.find((entry) => entry.slug === sub);
  if (fromMain) {
    return fromMain.label;
  }
  const anywhere = MAIN_CATEGORIES.flatMap((category) => category.subcategories).find(
    (entry) => entry.slug === sub,
  );
  return anywhere?.label ?? sub;
}

export function styleLabel(slug: string): string {
  return PRODUCT_STYLES.find((style) => style.slug === slug)?.label ?? slug;
}

export function typeLabel(slug: string): string {
  return PRODUCT_TYPES.find((type) => type.slug === slug)?.label ?? slug;
}
