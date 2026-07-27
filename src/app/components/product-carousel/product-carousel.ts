import {
  AfterViewInit,
  Component,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
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

  protected readonly dragging = signal(false);

  private static readonly dragThresholdPx = 6;

  private copyWidthPx = 0;
  private pointerDown = false;
  private isDragging = false;
  private dragSuppressClick = false;
  private dragPointerId: number | null = null;
  private dragStartClientX = 0;
  private dragStartTranslate = 0;

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

    const track = this.carouselTrack()?.nativeElement;
    track?.addEventListener(
      'click',
      (event) => {
        if (this.dragSuppressClick) {
          event.preventDefault();
          event.stopPropagation();
          this.dragSuppressClick = false;
        }
      },
      true,
    );
  }

  /**
   * Drag only actually engages once the pointer has moved past a threshold —
   * until then this is indistinguishable from a plain click, so we leave the
   * track's transform/animation and pointer capture untouched so clicks on
   * "Do koszyka" / wishlist buttons keep working normally.
   */
  protected onPointerDown(event: PointerEvent): void {
    this.pointerDown = true;
    this.dragPointerId = event.pointerId;
    this.dragStartClientX = event.clientX;
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.pointerDown || this.dragPointerId !== event.pointerId) {
      return;
    }
    const track = this.carouselTrack()?.nativeElement;
    if (!track) {
      return;
    }

    const delta = event.clientX - this.dragStartClientX;

    if (!this.isDragging) {
      if (Math.abs(delta) < ProductCarousel.dragThresholdPx) {
        return;
      }
      this.isDragging = true;
      this.dragging.set(true);
      track.setPointerCapture(event.pointerId);
      track.classList.remove('carousel__track--animated');
      this.dragStartTranslate = this.readTranslateX(track);
    }

    const next = this.wrapTranslate(this.dragStartTranslate + delta);
    track.style.transform = `translateX(${next}px)`;
  }

  protected onPointerUp(event: PointerEvent): void {
    this.pointerDown = false;
    this.dragPointerId = null;

    if (!this.isDragging) {
      return;
    }
    this.isDragging = false;
    this.dragging.set(false);

    const track = this.carouselTrack()?.nativeElement;
    if (!track) {
      return;
    }
    if (track.hasPointerCapture(event.pointerId)) {
      track.releasePointerCapture(event.pointerId);
    }
    this.dragSuppressClick = true;

    const currentX = this.readTranslateX(track);
    this.resumeAnimationFrom(track, currentX);
  }

  private readTranslateX(track: HTMLElement): number {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(track).transform);
    return matrix.m41;
  }

  private wrapTranslate(x: number): number {
    if (!this.copyWidthPx) {
      return x;
    }
    let wrapped = x % this.copyWidthPx;
    if (wrapped > 0) {
      wrapped -= this.copyWidthPx;
    }
    return wrapped;
  }

  private resumeAnimationFrom(track: HTMLElement, x: number): void {
    track.style.setProperty('--carousel-start', `${x}px`);
    track.style.setProperty('--carousel-end', `${x + this.copyWidthPx}px`);
    track.style.transform = `translateX(${x}px)`;
    track.classList.remove('carousel__track--animated');
    void track.offsetWidth;
    track.classList.add('carousel__track--animated');
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

    this.copyWidthPx = copyWidthPx;

    track.style.setProperty('--carousel-start', `${startX}px`);
    track.style.setProperty('--carousel-end', `${endX}px`);
    track.style.setProperty('--carousel-duration', `${durationSeconds}s`);
    track.style.transform = `translateX(${startX}px)`;
    track.classList.add('carousel__track--animated');
  }
}
