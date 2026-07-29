import {
  AfterViewInit,
  Component,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ProductsService } from '../../services/products.service';
import { ProductCard } from '../product-card/product-card';

@Component({
  selector: 'app-product-carousel',
  imports: [ProductCard],
  templateUrl: './product-carousel.html',
  styleUrl: './product-carousel.scss',
})
export class ProductCarousel implements AfterViewInit {
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
    track.style.setProperty('--carousel-offset', `${x}px`);
    track.style.transform = `translateX(${x}px)`;
    track.classList.remove('carousel__track--animated');
    void track.offsetWidth;
    track.classList.add('carousel__track--animated');
  }

  private setupCarouselAnimation(): void {
    const track = this.carouselTrack()?.nativeElement;
    const viewport = this.carouselViewport()?.nativeElement;
    const itemCount = track?.children.length ?? 0;
    if (!track || !viewport || itemCount < 2 || itemCount % 2 !== 0) {
      return;
    }

    const firstItem = track.children[0] as HTMLElement;
    const secondCopyStart = track.children[itemCount / 2] as HTMLElement;
    this.copyWidthPx = secondCopyStart.offsetLeft - firstItem.offsetLeft;

    // Ruch w prawo: start przesunięty o jedną kopię w lewo, animacja wraca do 0,
    // dzięki czemu druga kopia bezszwowo zastępuje pierwszą.
    const offsetX = -this.copyWidthPx;
    const durationSeconds = this.copyWidthPx / this.carouselSpeedPxPerSecond;

    track.style.setProperty('--carousel-offset', `${offsetX}px`);
    track.style.setProperty('--carousel-duration', `${durationSeconds}s`);
    track.style.transform = `translateX(${offsetX}px)`;
    track.classList.add('carousel__track--animated');
  }
}
