import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { categoryLabel, subcategoryLabel } from '../../models/category';
import { ResolvedCollection } from '../../models/collection';
import { PricePipe } from '../../pipes/price.pipe';
import { CartService } from '../../services/cart.service';

const CYCLE_INTERVAL_MS = 1000;

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, PricePipe],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard {
  readonly product = input.required<ResolvedCollection>();

  protected readonly cart = inject(CartService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categoryCaption = computed(() => {
    const product = this.product();
    return (
      subcategoryLabel(product.category, product.subcategory) || categoryLabel(product.category)
    );
  });

  protected readonly hasOverlay = computed(() => this.product().imageUrls.length > 1);

  private readonly overlayIndex = signal(1);
  protected readonly overlayImage = computed(
    () => this.product().imageUrls[this.overlayIndex()],
  );

  private cycleTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.clearTimer());
  }

  protected startCycle(): void {
    const images = this.product().imageUrls;
    if (images.length <= 1) {
      return;
    }
    this.overlayIndex.set(1);
    if (images.length <= 2) {
      return;
    }
    this.clearTimer();
    this.cycleTimer = setInterval(() => {
      const total = this.product().imageUrls.length;
      this.overlayIndex.update((i) => (i + 1) % total);
    }, CYCLE_INTERVAL_MS);
  }

  protected stopCycle(): void {
    this.clearTimer();
    this.overlayIndex.set(1);
  }

  private clearTimer(): void {
    if (this.cycleTimer !== null) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = null;
    }
  }
}
