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

  private readonly index = signal(0);

  protected readonly activeIndex = computed(() =>
    Math.min(this.index(), Math.max(0, this.images().length - 1)),
  );
  protected readonly activeImage = computed(() => this.images()[this.activeIndex()]);

  constructor() {
    effect(() => {
      this.images();
      this.index.set(0);
    });
  }

  protected select(position: number): void {
    this.index.set(position);
  }
}
