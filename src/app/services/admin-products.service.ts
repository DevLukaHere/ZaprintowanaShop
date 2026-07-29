import { Injectable, resource } from '@angular/core';
import { getProductImageUrl, supabase } from '../core/supabase-client';
import { Collection, ProductInput } from '../models/collection';

const PRODUCT_IMAGES_BUCKET = 'product-images';

function imagePaths(product: Collection | ProductInput): string[] {
  const printImages = Object.values(product.envelope_print?.overrides ?? {})
    .map((override) => override?.image)
    .filter((path): path is string => !!path);

  return [product.image, ...(product.images ?? []), ...printImages].filter(
    (path): path is string => !!path,
  );
}

@Injectable({ providedIn: 'root' })
export class AdminProductsService {
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

  async uploadImage(file: File): Promise<string> {
    const path = `${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, file);
    if (error) {
      throw new Error(error.message);
    }
    return path;
  }

  async create(input: ProductInput): Promise<void> {
    const id = crypto.randomUUID();
    const { error } = await supabase.from('products').insert({ id, ...input });
    if (error) {
      throw new Error(error.message);
    }
    this.reload();
  }

  async update(id: string, input: ProductInput): Promise<void> {
    const previous = this.products()?.find((product) => product.id === id);

    const { error } = await supabase.from('products').update(input).eq('id', id);
    if (error) {
      throw new Error(error.message);
    }

    const keep = new Set(imagePaths(input));
    const orphans = imagePaths(previous ?? input).filter((path) => !keep.has(path));
    if (orphans.length) {
      await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(orphans);
    }
    this.reload();
  }

  async remove(id: string): Promise<void> {
    const product = this.products()?.find((entry) => entry.id === id);

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }

    const paths = product ? imagePaths(product) : [];
    if (paths.length) {
      await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(paths);
    }
    this.reload();
  }
}
