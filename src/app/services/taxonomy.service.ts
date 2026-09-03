import { Injectable, computed, resource } from '@angular/core';
import { supabase } from '../core/supabase-client';
import {
  CategoryLink,
  MAIN_CATEGORIES_SEED,
  MainCategoryDef,
  PRODUCT_STYLES_SEED,
  PRODUCT_TYPES_SEED,
  findMainCategoryIn,
  labelIn,
  subcategoryLabelIn,
} from '../models/category';

export type TaxonomyKind = 'category' | 'subcategory' | 'style' | 'type';

export const TAXONOMY_KIND_LABELS: Record<TaxonomyKind, string> = {
  category: 'Kategoria',
  subcategory: 'Podkategoria',
  style: 'Styl',
  type: 'Rodzaj',
};

export interface TaxonomyEntry {
  id: string;
  kind: TaxonomyKind;
  slug: string;
  label: string;
  parent_slug: string | null;
  sort_order: number;
  filterable: boolean;
  is_flag: boolean;
  is_system: boolean;
}

export interface TaxonomyInput {
  kind: TaxonomyKind;
  slug: string;
  label: string;
  parent_slug?: string | null;
  filterable?: boolean;
}

function byOrder(a: TaxonomyEntry, b: TaxonomyEntry): number {
  // Najpierw grupujemy po rodzicu, żeby podkategorie różnych kategorii się nie przeplatały.
  return (
    (a.parent_slug ?? '').localeCompare(b.parent_slug ?? '') ||
    a.sort_order - b.sort_order ||
    a.label.localeCompare(b.label, 'pl')
  );
}

@Injectable({ providedIn: 'root' })
export class TaxonomyService {
  private readonly entriesResource = resource({
    loader: async () => {
      const { data, error } = await supabase.from('taxonomy').select('*');
      if (error) {
        throw error;
      }
      return (data ?? []) as TaxonomyEntry[];
    },
  });

  readonly isLoading = this.entriesResource.isLoading;
  readonly error = this.entriesResource.error;

  /** Wszystkie wpisy, posortowane — na potrzeby panelu. */
  readonly entries = computed(() => [...(this.entriesResource.value() ?? [])].sort(byOrder));

  private readonly ofKind = (kind: TaxonomyKind) =>
    this.entries().filter((entry) => entry.kind === kind);

  /**
   * Kategorie z podkategoriami. Zanim tabela się wczyta, oddajemy wartości startowe —
   * dzięki temu menu i pasek kategorii nie migają pustką przy wejściu na stronę.
   */
  readonly mainCategories = computed<readonly MainCategoryDef[]>(() => {
    const loaded = this.entriesResource.value();
    if (!loaded?.length) {
      return MAIN_CATEGORIES_SEED;
    }
    const subcategories = this.ofKind('subcategory');
    return this.ofKind('category').map((category) => ({
      slug: category.slug,
      label: category.label,
      filterable: category.filterable,
      subcategories: subcategories
        .filter((sub) => sub.parent_slug === category.slug)
        .map(({ slug, label }) => ({ slug, label })),
    }));
  });

  readonly styles = computed<readonly CategoryLink[]>(() => {
    const loaded = this.entriesResource.value();
    if (!loaded?.length) {
      return PRODUCT_STYLES_SEED;
    }
    return this.ofKind('style').map(({ slug, label }) => ({ slug, label }));
  });

  readonly types = computed<readonly CategoryLink[]>(() => {
    const loaded = this.entriesResource.value();
    if (!loaded?.length) {
      return PRODUCT_TYPES_SEED;
    }
    return this.ofKind('type').map(({ slug, label }) => ({ slug, label }));
  });

  findMainCategory(slug: string | undefined): MainCategoryDef | undefined {
    return findMainCategoryIn(this.mainCategories(), slug);
  }

  categoryLabel(slug: string | undefined): string {
    return this.findMainCategory(slug)?.label ?? '';
  }

  subcategoryLabel(main: string | undefined, sub: string | undefined): string {
    return subcategoryLabelIn(this.mainCategories(), main, sub);
  }

  styleLabel(slug: string): string {
    return labelIn(this.styles(), slug);
  }

  typeLabel(slug: string): string {
    return labelIn(this.types(), slug);
  }

  reload(): void {
    this.entriesResource.reload();
  }

  async create(input: TaxonomyInput): Promise<void> {
    const siblings = this.entries().filter(
      (entry) => entry.kind === input.kind && entry.parent_slug === (input.parent_slug ?? null),
    );
    const sortOrder = (siblings.at(-1)?.sort_order ?? 0) + 10;

    const { error } = await supabase.from('taxonomy').insert({
      kind: input.kind,
      slug: input.slug,
      label: input.label,
      parent_slug: input.parent_slug ?? null,
      filterable: input.filterable ?? true,
      sort_order: sortOrder,
    });

    if (error) {
      throw new Error(error.code === '23505' ? 'Taki wpis już istnieje.' : error.message);
    }
    this.reload();
  }

  /** Zmieniamy wyłącznie etykietę — slug jest w adresach i w danych produktów. */
  async rename(id: string, label: string): Promise<void> {
    const { error } = await supabase.from('taxonomy').update({ label }).eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
    this.reload();
  }

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('taxonomy').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
    this.reload();
  }
}
