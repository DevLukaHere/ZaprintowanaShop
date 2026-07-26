import { Injectable, resource } from '@angular/core';
import { getProductImageUrl, supabase } from '../core/supabase-client';
import { Collection } from '../models/collection';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly productsResource = resource({
    loader: async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) {
        throw error;
      }
      return ((data ?? []) as Collection[]).map((product) => ({
        ...product,
        image: product.image ? getProductImageUrl(product.image) : product.image,
      }));
    },
  });

  readonly products = this.productsResource.value;
  readonly isLoading = this.productsResource.isLoading;
  readonly error = this.productsResource.error;

  getById(id: string): Collection | undefined {
    return this.products()?.find((product) => product.id === id);
  }
}
