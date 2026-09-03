import {
  AfterViewInit,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { PRODUCT_HIGHLIGHTS } from '../../models/collection';
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

  /** Minimalna liczba kafelków w jednej kopii taśmy — przy krótkiej selekcji
   *  powtarzamy produkty, żeby taśma wypełniła szerokość ekranu bez luk. */
  private static readonly minItemsPerCopy = 8;

  private copyWidthPx = 0;
  private pointerDown = false;
  private isDragging = false;
  private dragSuppressClick = false;
  private dragPointerId: number | null = null;
  private dragStartClientX = 0;
  private dragStartTranslate = 0;

  /** Zakładki, pod którymi jest przynajmniej jeden produkt. */
  protected readonly highlights = computed(() => {
    const products = this.productsService.products() ?? [];
    return PRODUCT_HIGHLIGHTS.filter((highlight) =>
      products.some((product) => product[highlight.flag]),
    );
  });

  private readonly selectedSlug = signal<string | undefined>(undefined);

  /** Wybór użytkownika, o ile nadal istnieje — inaczej pierwsza dostępna zakładka. */
  protected readonly activeSlug = computed(() => {
    const available = this.highlights();
    const selected = this.selectedSlug();
    return available.some((highlight) => highlight.slug === selected)
      ? selected
      : available[0]?.slug;
  });

  protected readonly visibleProducts = computed(() => {
    const products = this.productsService.products() ?? [];
    const active = this.highlights().find((highlight) => highlight.slug === this.activeSlug());
    return active ? products.filter((product) => product[active.flag]) : products;
  });

  protected readonly carouselItems = computed(() => {
    const products = this.visibleProducts();
    if (!products.length) {
      return [];
    }
    const repeats = Math.ceil(ProductCarousel.minItemsPerCopy / products.length);
    const copy = Array.from({ length: repeats }, () => products).flat();
    return [...copy, ...copy];
  });

  constructor() {
    effect(() => {
      if (this.carouselItems().length) {
        queueMicrotask(() => this.setupCarouselAnimation());
      }
    });
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

  protected selectHighlight(slug: string): void {
    this.selectedSlug.set(slug);
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

  /** Animacja przesuwa taśmę o dokładnie jedną kopię — stąd zakres [x, x + copyWidth]. */
  private setAnimationRange(track: HTMLElement, from: number): void {
    track.style.setProperty('--carousel-from', `${from}px`);
    track.style.setProperty('--carousel-to', `${from + this.copyWidthPx}px`);
  }

  private resumeAnimationFrom(track: HTMLElement, x: number): void {
    this.setAnimationRange(track, x);
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

    this.setAnimationRange(track, offsetX);
    track.style.setProperty('--carousel-duration', `${durationSeconds}s`);
    track.style.transform = `translateX(${offsetX}px)`;

    // Restart animacji — bez tego przełączenie zakładki zostawiłoby taśmę
    // w połowie poprzedniego cyklu, z nieaktualną szerokością kopii.
    track.classList.remove('carousel__track--animated');
    void track.offsetWidth;
    track.classList.add('carousel__track--animated');
  }
}
