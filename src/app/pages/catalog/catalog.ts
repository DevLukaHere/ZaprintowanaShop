import { Component, computed, inject, input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CategoryBar } from '../../components/category-bar/category-bar';
import { Footer } from '../../components/footer/footer';
import { Navbar } from '../../components/navbar/navbar';
import { ProductCard } from '../../components/product-card/product-card';
import {
  PRODUCT_STYLES,
  PRODUCT_TYPES,
  findMainCategory,
  subcategoryLabel,
} from '../../models/category';
import { ProductsService } from '../../services/products.service';

function toList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

@Component({
  selector: 'app-catalog',
  imports: [Navbar, Footer, CategoryBar, ProductCard],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
})
export class CatalogPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly productsService = inject(ProductsService);

  readonly category = input<string | undefined>(undefined);
  readonly subcategory = input<string | undefined>(undefined);
  readonly styles = input<string | undefined>(undefined);
  readonly types = input<string | undefined>(undefined);

  protected readonly allStyles = PRODUCT_STYLES;
  protected readonly allTypes = PRODUCT_TYPES;

  protected readonly activeStyles = computed(() => toList(this.styles()));
  protected readonly activeTypes = computed(() => toList(this.types()));

  protected readonly mainCategory = computed(() => findMainCategory(this.category()));

  protected readonly heading = computed(
    () =>
      subcategoryLabel(this.category(), this.subcategory()) ||
      this.mainCategory()?.label ||
      'Wszystkie produkty',
  );

  protected readonly products = computed(() =>
    this.productsService.filter({
      category: this.category(),
      subcategory: this.subcategory(),
      styles: this.activeStyles(),
      types: this.activeTypes(),
    }),
  );

  protected readonly showFilters = computed(() => this.mainCategory()?.filterable ?? true);

  protected readonly hasFilters = computed(
    () => this.activeStyles().length > 0 || this.activeTypes().length > 0,
  );

  protected isStyleSelected(slug: string): boolean {
    return this.activeStyles().includes(slug);
  }

  protected isTypeSelected(slug: string): boolean {
    return this.activeTypes().includes(slug);
  }

  protected toggleFilter(param: 'styles' | 'types', slug: string): void {
    const current = param === 'styles' ? this.activeStyles() : this.activeTypes();
    const next = current.includes(slug)
      ? current.filter((entry) => entry !== slug)
      : [...current, slug];

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [param]: next.length ? next.join(',') : null },
      queryParamsHandling: 'merge',
    });
  }

  protected clearFilters(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { styles: null, types: null },
      queryParamsHandling: 'merge',
    });
  }
}
