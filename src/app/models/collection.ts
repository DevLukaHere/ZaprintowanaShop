export interface Collection {
  id: string;
  badge?: string;
  name: string;
  description: string;
  price: number;
  /** Storage path within the product-images bucket, not a public URL. */
  image?: string;
}

/** Editable product fields, used by the admin create/update forms. */
export type ProductInput = Omit<Collection, 'id'>;
