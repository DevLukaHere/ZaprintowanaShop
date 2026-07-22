import { Injectable, computed, signal } from '@angular/core';

const CART_KEY = 'zaprintowana:cart';
const WISHLIST_KEY = 'zaprintowana:wishlist';

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly cart = signal<Record<string, number>>(readJson(CART_KEY, {}));
  private readonly wishlist = signal<string[]>(readJson(WISHLIST_KEY, []));

  readonly cartCount = computed(() =>
    Object.values(this.cart()).reduce((sum, qty) => sum + qty, 0),
  );
  readonly wishlistCount = computed(() => this.wishlist().length);

  readonly cartEntries = computed(() =>
    Object.entries(this.cart()).map(([id, qty]) => ({ id, qty })),
  );
  readonly wishlistIds = computed(() => this.wishlist());

  addToCart(id: string): void {
    this.cart.update((items) => ({ ...items, [id]: (items[id] ?? 0) + 1 }));
    localStorage.setItem(CART_KEY, JSON.stringify(this.cart()));
  }

  removeFromCart(id: string): void {
    this.cart.update((items) => {
      const { [id]: _removed, ...rest } = items;
      return rest;
    });
    localStorage.setItem(CART_KEY, JSON.stringify(this.cart()));
  }

  isWishlisted(id: string): boolean {
    return this.wishlist().includes(id);
  }

  toggleWishlist(id: string): void {
    this.wishlist.update((ids) =>
      ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id],
    );
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(this.wishlist()));
  }
}
