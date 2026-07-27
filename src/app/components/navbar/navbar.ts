import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Collection } from '../../models/collection';
import { PricePipe } from '../../pipes/price.pipe';
import { CartService } from '../../services/cart.service';
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
  protected readonly mobileMenuOpen = signal(false);
  protected readonly panelOpen = signal(false);
  protected readonly panelContent = signal<'wishlist' | 'cart'>('wishlist');

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
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

  protected getCollection(id: string): Collection | undefined {
    return this.products.getById(id);
  }
}
