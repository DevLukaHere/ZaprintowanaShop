import { Injectable, resource } from '@angular/core';
import { getProductImageUrl, supabase } from '../core/supabase-client';
import { Collection, ProductInput } from '../models/collection';

const PRODUCT_IMAGES_BUCKET = 'product-images';

@Injectable({ providedIn: 'root' })
export class AdminProductsService {
  /** Admin-only: raw rows (image holds a storage path, not a public URL). */
  private readonly productsResource = resource({
    loader: async () => {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) {
        throw error;
      }
      return (data ?? []) as Collection[];
    },
  });

  readonly products = this.productsResource.value;
  readonly isLoading = this.productsResource.isLoading;
  readonly error = this.productsResource.error;

  reload(): void {
    this.productsResource.reload();
  }

  imageUrl(path: string | undefined): string | undefined {
    return path ? getProductImageUrl(path) : undefined;
  }

  async create(input: ProductInput, file: File | null): Promise<void> {
    const image = file ? await this.uploadImage(file) : input.image;

    const { error } = await supabase.from('products').insert({ ...input, image });
    if (error) {
      throw new Error(error.message);
    }
    this.reload();
  }

  async update(id: string, input: ProductInput, file: File | null): Promise<void> {
    const previousImage = this.products()?.find((product) => product.id === id)?.image;
    const image = file ? await this.uploadImage(file) : input.image;

    const { error } = await supabase.from('products').update({ ...input, image }).eq('id', id);
    if (error) {
      throw new Error(error.message);
    }

    if (file && previousImage && previousImage !== image) {
      await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([previousImage]);
    }
    this.reload();
  }

  async remove(id: string): Promise<void> {
    const image = this.products()?.find((product) => product.id === id)?.image;

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }

    if (image) {
      await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([image]);
    }
    this.reload();
  }

  private async uploadImage(file: File): Promise<string> {
    const path = `${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, file);
    if (error) {
      throw new Error(error.message);
    }
    return path;
  }
}
