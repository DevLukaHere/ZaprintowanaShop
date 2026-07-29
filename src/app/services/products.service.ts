import { Injectable, resource } from '@angular/core';
import { getProductImageUrl, supabase } from '../core/supabase-client';
import { Collection, ResolvedCollection } from '../models/collection';
import { isFlagSubcategory } from '../models/category';
import { EnvelopePrintConfig, ProductOption } from '../models/product-options';

export interface CatalogFilter {
  category?: string;
  subcategory?: string;
  styles?: readonly string[];
  types?: readonly string[];
}

function resolveOptions(options: ProductOption[] | undefined): ProductOption[] | undefined {
  return options?.map((option) => ({
    ...option,
    image: option.image ? getProductImageUrl(option.image) : undefined,
  }));
}

function resolveEnvelopePrint(
  config: EnvelopePrintConfig | undefined,
): EnvelopePrintConfig | undefined {
  if (!config?.overrides) {
    return config;
  }
  const overrides = Object.fromEntries(
    Object.entries(config.overrides).map(([id, override]) => [
      id,
      { ...override, image: override?.image ? getProductImageUrl(override.image) : undefined },
    ]),
  );
  return { ...config, overrides };
}

function resolve(product: Collection): ResolvedCollection {
  const gallery = (product.images ?? []).filter(Boolean).map(getProductImageUrl);
  const primary = product.image ? getProductImageUrl(product.image) : undefined;
  const all = primary ? [primary, ...gallery] : gallery;

  return {
    ...product,
    imageUrl: all[0],
    imageUrls: all,
    paper_options: resolveOptions(product.paper_options),
    foil_options: resolveOptions(product.foil_options),
    envelope_options: resolveOptions(product.envelope_options),
    envelope_print: resolveEnvelopePrint(product.envelope_print),
  };
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly productsResource = resource({
    loader: async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) {
        throw error;
      }
      return ((data ?? []) as Collection[]).map(resolve);
    },
  });

  readonly products = this.productsResource.value;
  readonly isLoading = this.productsResource.isLoading;
  readonly error = this.productsResource.error;

  getById(id: string): ResolvedCollection | undefined {
    return this.products()?.find((product) => product.id === id);
  }

  filter(filter: CatalogFilter): ResolvedCollection[] {
    const products = this.products() ?? [];

    return products.filter((product) => {
      if (filter.category && product.category !== filter.category) {
        return false;
      }

      const sub = filter.subcategory;
      if (sub) {
        if (isFlagSubcategory(sub)) {
          if (sub === 'nowosci' && !product.is_new) {
            return false;
          }
          if (sub === 'bestsellery' && !product.is_bestseller) {
            return false;
          }
        } else if (product.subcategory !== sub) {
          return false;
        }
      }

      if (filter.styles?.length && !filter.styles.some((s) => product.styles?.includes(s))) {
        return false;
      }
      if (filter.types?.length && !filter.types.some((t) => product.types?.includes(t))) {
        return false;
      }
      return true;
    });
  }

  related(product: ResolvedCollection, limit = 8): ResolvedCollection[] {
    const products = (this.products() ?? []).filter((entry) => entry.id !== product.id);

    const score = (candidate: ResolvedCollection): number => {
      let value = 0;
      if (candidate.category && candidate.category === product.category) {
        value += 4;
      }
      if (candidate.subcategory && candidate.subcategory === product.subcategory) {
        value += 2;
      }
      value += (candidate.styles ?? []).filter((s) => product.styles?.includes(s)).length;
      value += (candidate.types ?? []).filter((t) => product.types?.includes(t)).length;
      return value;
    };

    return [...products].sort((a, b) => score(b) - score(a)).slice(0, limit);
  }
}
