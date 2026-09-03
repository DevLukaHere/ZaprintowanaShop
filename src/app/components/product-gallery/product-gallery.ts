import { Component, computed, effect, input, signal } from '@angular/core';

@Component({
  selector: 'app-product-gallery',
  imports: [],
  templateUrl: './product-gallery.html',
  styleUrl: './product-gallery.scss',
})
export class ProductGallery {
  readonly images = input.required<readonly string[]>();
  readonly alt = input('');

  private static readonly swipeThresholdPx = 40;

  private readonly index = signal(0);

  private swipePointerId: number | null = null;
  private swipeStartClientX = 0;

  protected readonly activeIndex = computed(() =>
    Math.min(this.index(), Math.max(0, this.images().length - 1)),
  );
  protected readonly activeImage = computed(() => this.images()[this.activeIndex()]);
  protected readonly hasMultiple = computed(() => this.images().length > 1);

  constructor() {
    effect(() => {
      this.images();
      this.index.set(0);
    });
  }

  protected select(position: number): void {
    this.index.set(position);
  }

  protected prev(): void {
    this.step(-1);
  }

  protected next(): void {
    this.step(1);
  }

  protected onPointerDown(event: PointerEvent): void {
    if (!this.hasMultiple()) {
      return;
    }
    this.swipePointerId = event.pointerId;
    this.swipeStartClientX = event.clientX;
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.swipePointerId !== event.pointerId) {
      return;
    }
    const delta = event.clientX - this.swipeStartClientX;
    this.swipePointerId = null;

    if (Math.abs(delta) < ProductGallery.swipeThresholdPx) {
      return;
    }
    this.step(delta < 0 ? 1 : -1);
  }

  protected onPointerCancel(): void {
    this.swipePointerId = null;
  }

  private step(delta: number): void {
    const count = this.images().length;
    if (count < 2) {
      return;
    }
    this.index.set((this.activeIndex() + delta + count) % count);
  }
}
