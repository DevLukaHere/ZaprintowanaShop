import { AfterViewInit, Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { CartService } from '../../services/cart.service';
import { ProductsService } from '../../services/products.service';

@Component({
  selector: 'app-product-carousel',
  imports: [],
  templateUrl: './product-carousel.html',
  styleUrl: './product-carousel.scss',
})
export class ProductCarousel implements AfterViewInit {
  protected readonly cart = inject(CartService);
  protected readonly productsService = inject(ProductsService);

  private readonly carouselSpeedPxPerSecond = 24;

  private readonly carouselTrack = viewChild<ElementRef<HTMLElement>>('carouselTrack');
  private readonly carouselViewport = viewChild<ElementRef<HTMLElement>>('carouselViewport');

  constructor() {
    effect(() => {
      const products = this.productsService.products();
      if (products?.length) {
        queueMicrotask(() => this.setupCarouselAnimation());
      }
    });
  }

  protected get carouselItems() {
    const products = this.productsService.products() ?? [];
    return [...products, ...products];
  }

  ngAfterViewInit(): void {
    this.setupCarouselAnimation();
  }

  private setupCarouselAnimation(): void {
    const track = this.carouselTrack()?.nativeElement;
    const viewport = this.carouselViewport()?.nativeElement;
    if (!track || !viewport || track.children.length === 0) {
      return;
    }

    const copyWidthPx = track.scrollWidth / 2;
    const firstItem = track.children[0] as HTMLElement | undefined;
    const itemWidth = firstItem?.getBoundingClientRect().width ?? 0;

    const startX = viewport.clientWidth - itemWidth - copyWidthPx;
    const endX = startX + copyWidthPx;
    const durationSeconds = copyWidthPx / this.carouselSpeedPxPerSecond;

    track.style.setProperty('--carousel-start', `${startX}px`);
    track.style.setProperty('--carousel-end', `${endX}px`);
    track.style.setProperty('--carousel-duration', `${durationSeconds}s`);
    track.style.transform = `translateX(${startX}px)`;
    track.classList.add('carousel__track--animated');
  }
}
