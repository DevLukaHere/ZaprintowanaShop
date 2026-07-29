import { Injectable, computed, signal } from '@angular/core';
import { OrderMode, cartTotals, lineTotals, unitPrice } from '../core/pricing';
import { Collection } from '../models/collection';
import { ProductConfiguration, emptyConfiguration } from '../models/product-options';

const CART_KEY = 'zaprintowana:cart:v2';
const LEGACY_CART_KEY = 'zaprintowana:cart';
const WISHLIST_KEY = 'zaprintowana:wishlist';

export interface CartLine {
  key: string;
  productId: string;
  quantity: number;
  mode: OrderMode;
  configuration: ProductConfiguration;
  unitPrice: number;
}

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

function configurationKey(
  productId: string,
  mode: OrderMode,
  configuration: ProductConfiguration,
): string {
  const parts = [
    productId,
    mode,
    configuration.paperId ?? '',
    configuration.foilId ?? '',
    configuration.envelopeId ?? '',
    configuration.guestPersonalisation ? 'guests' : '',
    configuration.envelopePrintId ?? '',
    configuration.envelopeText ?? '',
    configuration.express ? 'express' : '',
    JSON.stringify(
      Object.entries(configuration.personalisation ?? {})
        .filter(([, value]) => !!value)
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
  ];
  return parts.join('|');
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly lineList = signal<CartLine[]>(this.load());
  private readonly wishlist = signal<string[]>(readJson(WISHLIST_KEY, []));

  readonly lines = this.lineList.asReadonly();

  readonly cartCount = computed(() =>
    this.lineList().reduce((sum, line) => sum + line.quantity, 0),
  );
  readonly wishlistCount = computed(() => this.wishlist().length);
  readonly wishlistIds = this.wishlist.asReadonly();

  readonly totals = computed(() => cartTotals(this.lineList()));

  private load(): CartLine[] {
    const lines = readJson<CartLine[]>(CART_KEY, []);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LEGACY_CART_KEY);
    }
    return Array.isArray(lines) ? lines.filter((line) => !!line?.productId) : [];
  }

  private persist(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CART_KEY, JSON.stringify(this.lineList()));
    }
  }

  lineTotals(line: CartLine) {
    return lineTotals(line);
  }

  add(
    product: Collection,
    configuration: ProductConfiguration = emptyConfiguration(),
    quantity = 1,
    mode: OrderMode = 'standard',
  ): void {
    const key = configurationKey(product.id, mode, configuration);
    const price = unitPrice(product, configuration);

    this.lineList.update((lines) => {
      const existing = lines.find((line) => line.key === key);
      if (existing) {
        return lines.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + quantity } : line,
        );
      }
      return [
        ...lines,
        { key, productId: product.id, quantity, mode, configuration, unitPrice: price },
      ];
    });
    this.persist();
  }

  remove(key: string): void {
    this.lineList.update((lines) => lines.filter((line) => line.key !== key));
    this.persist();
  }

  setQuantity(key: string, quantity: number): void {
    if (quantity < 1) {
      this.remove(key);
      return;
    }
    this.lineList.update((lines) =>
      lines.map((line) =>
        line.key === key ? { ...line, quantity: Math.min(quantity, 9999) } : line,
      ),
    );
    this.persist();
  }

  clearCart(): void {
    this.lineList.set([]);
    this.persist();
  }

  isWishlisted(id: string): boolean {
    return this.wishlist().includes(id);
  }

  toggleWishlist(id: string): void {
    this.wishlist.update((ids) =>
      ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id],
    );
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(this.wishlist()));
    }
  }
}
