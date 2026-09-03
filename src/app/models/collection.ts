import { MainCategory } from './category';
import { EnvelopePrintConfig, ProductOption } from './product-options';

export interface Collection {
  id: string;
  badge?: string;
  name: string;
  description: string;
  full_description?: string;
  price: number;
  image?: string;
  images?: string[];

  category?: MainCategory;
  subcategory?: string;
  styles?: string[];
  types?: string[];
  is_new?: boolean;
  is_bestseller?: boolean;
  is_promo?: boolean;
  is_featured?: boolean;

  paper_options?: ProductOption[];
  foil_options?: ProductOption[];
  envelope_options?: ProductOption[];
  envelope_print?: EnvelopePrintConfig;
}

export type ProductInput = Omit<Collection, 'id'>;

/** Flagi wyróżnień — zakładki nad karuzelą na stronie głównej. */
export type HighlightFlag = 'is_promo' | 'is_bestseller' | 'is_featured' | 'is_new';

export interface ProductHighlight {
  slug: string;
  label: string;
  flag: HighlightFlag;
}

export const PRODUCT_HIGHLIGHTS: readonly ProductHighlight[] = [
  { slug: 'promocje', label: 'Promocje', flag: 'is_promo' },
  { slug: 'popularne', label: 'Popularne', flag: 'is_bestseller' },
  { slug: 'polecane', label: 'Polecane', flag: 'is_featured' },
  { slug: 'new', label: 'Nowości', flag: 'is_new' },
];

export interface ResolvedCollection extends Collection {
  imageUrl?: string;
  imageUrls: string[];
}
