import { Component, inject, signal } from '@angular/core';
import { COLLECTIONS, Collection } from '../../models/collection';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-navbar',
  imports: [],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  protected readonly cart = inject(CartService);
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
    return COLLECTIONS.find((collection) => collection.id === id);
  }
}
