export interface Collection {
  id: string;
  badge?: string;
  name: string;
  description: string;
  price: string;
  theme: 'sage' | 'slate' | 'blush' | 'cream' | 'wine' | 'charcoal';
  image?: string;
}
