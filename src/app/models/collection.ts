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

  paper_options?: ProductOption[];
  foil_options?: ProductOption[];
  envelope_options?: ProductOption[];
  envelope_print?: EnvelopePrintConfig;
}

export type ProductInput = Omit<Collection, 'id'>;

export interface ResolvedCollection extends Collection {
  imageUrl?: string;
  imageUrls: string[];
}
