import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { describeConfiguration } from '../../core/configuration-summary';
import {
  MAIN_CATEGORIES,
  MainCategoryDef,
  PRODUCT_STYLES,
  PRODUCT_TYPES,
} from '../../models/category';
import { PricePipe } from '../../pipes/price.pipe';
import { CartLine, CartService } from '../../services/cart.service';
import { ProductsService } from '../../services/products.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, PricePipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  protected readonly cart = inject(CartService);
  protected readonly products = inject(ProductsService);

  protected readonly categories = MAIN_CATEGORIES;
  protected readonly styles = PRODUCT_STYLES;
  protected readonly types = PRODUCT_TYPES;

  protected readonly mobileMenuOpen = signal(false);
  protected readonly openCategory = signal<string | null>(null);
  protected readonly panelOpen = signal(false);
  protected readonly panelContent = signal<'wishlist' | 'cart'>('wishlist');

  protected readonly cartLines = computed(() =>
    this.cart.lines().map((line) => {
      const product = this.products.getById(line.productId);
      return {
        line,
        name: product?.name ?? 'Produkt',
        imageUrl: product?.imageUrl,
        details: describeConfiguration(product, line.configuration, line.mode),
        total: this.cart.lineTotals(line).total,
      };
    }),
  );

  protected readonly wishlistItems = computed(() =>
    this.cart
      .wishlistIds()
      .map((id) => this.products.getById(id))
      .filter((product) => !!product),
  );

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
    this.openCategory.set(null);
  }

  protected toggleCategory(slug: string): void {
    this.openCategory.update((current) => (current === slug ? null : slug));
  }

  protected hasDropdown(category: MainCategoryDef): boolean {
    return category.subcategories.length > 0 || category.filterable;
  }

  protected closeMenus(): void {
    this.openCategory.set(null);
    this.mobileMenuOpen.set(false);
  }

  protected openPanel(type: 'wishlist' | 'cart'): void {
    if (this.panelOpen() && this.panelContent() === type) {
      this.panelOpen.set(false);
      return;
    }
    this.panelContent.set(type);
    this.panelOpen.set(true);
  }

  protected closePanel(): void {
    this.panelOpen.set(false);
  }

  protected removeLine(line: CartLine): void {
    this.cart.remove(line.key);
  }
}
