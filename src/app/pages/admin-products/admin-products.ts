import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminHeader } from '../../components/admin-header/admin-header';
import { MainCategory, slugify } from '../../models/category';
import { Collection, ProductInput } from '../../models/collection';
import {
  ENVELOPE_PRINT_OPTIONS,
  EnvelopePrintId,
  OPTION_GROUP_LABELS,
  OPTION_PRESETS,
  OptionGroup,
  ProductOption,
} from '../../models/product-options';
import { PricePipe } from '../../pipes/price.pipe';
import { AdminProductsService } from '../../services/admin-products.service';
import {
  TAXONOMY_KIND_LABELS,
  TaxonomyEntry,
  TaxonomyKind,
  TaxonomyService,
} from '../../services/taxonomy.service';

interface OptionDraft {
  id: string;
  label: string;
  swatch?: string;
  enabled: boolean;
  price: number;
}

interface PrintDraft {
  id: EnvelopePrintId;
  label: string;
  price: number;
  image?: string;
  file: File | null;
  previewUrl?: string;
}

const OPTION_GROUPS: OptionGroup[] = ['paper', 'foil', 'envelope'];

/** Bez ogonków i wielkości liter — żeby „zloc” trafiało w „złocone”. */
function normalise(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0142/g, 'l');
}

function searchableText(product: Collection): string {
  return normalise([product.name, product.description, product.full_description ?? ''].join(' '));
}

function draftsFrom(group: OptionGroup, saved: ProductOption[] | undefined): OptionDraft[] {
  const presets = OPTION_PRESETS[group];
  const savedById = new Map((saved ?? []).map((option) => [option.id, option]));

  const fromPresets = presets.map((preset) => ({
    id: preset.id,
    label: preset.label,
    swatch: preset.swatch,
    enabled: savedById.has(preset.id),
    price: savedById.get(preset.id)?.price ?? preset.price,
  }));

  const extras = (saved ?? [])
    .filter((option) => !presets.some((preset) => preset.id === option.id))
    .map((option) => ({
      id: option.id,
      label: option.label,
      swatch: option.swatch,
      enabled: true,
      price: option.price,
    }));

  return [...fromPresets, ...extras];
}

@Component({
  selector: 'app-admin-products',
  imports: [ReactiveFormsModule, AdminHeader, PricePipe],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.scss',
})
export class AdminProductsPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly productsService = inject(AdminProductsService);

  protected readonly taxonomy = inject(TaxonomyService);

  protected readonly mainCategories = this.taxonomy.mainCategories;
  protected readonly allStyles = this.taxonomy.styles;
  protected readonly allTypes = this.taxonomy.types;
  protected readonly optionGroups = OPTION_GROUPS;
  protected readonly optionGroupLabels = OPTION_GROUP_LABELS;

  protected readonly searchTerm = signal('');
  protected readonly categoryFilter = signal<MainCategory | 'all'>('all');

  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly deleteError = signal<string | null>(null);
  protected readonly draggingFile = signal(false);

  protected readonly mainImagePath = signal<string | undefined>(undefined);
  protected readonly mainImageFile = signal<File | null>(null);
  protected readonly mainPreviewUrl = signal<string | undefined>(undefined);

  protected readonly gallery = signal<{ path?: string; file?: File; previewUrl: string }[]>([]);

  protected readonly selectedStyles = signal<string[]>([]);
  protected readonly selectedTypes = signal<string[]>([]);

  protected readonly optionDrafts = signal<Record<OptionGroup, OptionDraft[]>>({
    paper: draftsFrom('paper', undefined),
    foil: draftsFrom('foil', undefined),
    envelope: draftsFrom('envelope', undefined),
  });

  protected readonly printEnabled = signal(false);
  protected readonly printDrafts = signal<PrintDraft[]>([]);

  protected readonly form = this.formBuilder.group({
    name: ['', Validators.required],
    description: ['', Validators.required],
    full_description: [''],
    price: this.formBuilder.control<number>(0, [Validators.required, Validators.min(0)]),
    badge: [''],
    category: this.formBuilder.control<MainCategory>('invitations', Validators.required),
    subcategory: [''],
    is_new: [false],
    is_bestseller: [false],
    is_promo: [false],
    is_featured: [false],
  });

  private readonly categoryValue = signal<MainCategory>('invitations');

  protected readonly subcategories = computed(
    () => this.taxonomy.findMainCategory(this.categoryValue())?.subcategories ?? [],
  );

  protected readonly showClassification = computed(
    () => this.taxonomy.findMainCategory(this.categoryValue())?.filterable ?? false,
  );

  constructor() {
    this.taxonomyForm.controls.kind.valueChanges.subscribe((kind) => {
      this.taxonomyKind.set(kind);
      if (kind !== 'subcategory') {
        this.taxonomyForm.controls.parent_slug.setValue('', { emitEvent: false });
      }
    });
    this.taxonomyForm.controls.label.valueChanges.subscribe((label) => {
      if (!this.slugEditedByHand) {
        this.taxonomyForm.controls.slug.setValue(slugify(label), { emitEvent: false });
        this.taxonomySlug.set(slugify(label));
      }
    });
    this.taxonomyForm.controls.slug.valueChanges.subscribe((slug) => {
      this.slugEditedByHand = true;
      this.taxonomySlug.set(slug);
    });

    this.form.controls.category.valueChanges.subscribe((value) => {
      this.categoryValue.set(value);
      if (!this.subcategories().some((sub) => sub.slug === this.form.controls.subcategory.value)) {
        this.form.controls.subcategory.setValue('');
      }
    });
  }

  /** Produkty po kategorii, bez wyszukiwarki — z tego liczymy liczniki przy chipach. */
  private readonly productsInCategory = computed(() => {
    const products = this.productsService.products() ?? [];
    const category = this.categoryFilter();
    return category === 'all'
      ? products
      : products.filter((product) => product.category === category);
  });

  protected readonly categoryOptions = computed(() => {
    const products = this.productsService.products() ?? [];
    return [
      { slug: 'all' as const, label: 'Wszystkie', count: products.length },
      ...this.mainCategories().map((category) => ({
        slug: category.slug,
        label: category.label,
        count: products.filter((product) => product.category === category.slug).length,
      })),
    ];
  });

  protected readonly visibleProducts = computed(() => {
    const query = normalise(this.searchTerm());
    const products = this.productsInCategory();
    if (!query) {
      return products;
    }
    return products.filter((product) => searchableText(product).includes(query));
  });

  protected resetBrowse(): void {
    this.searchTerm.set('');
    this.categoryFilter.set('all');
  }

  // --- Słowniki: kategorie / podkategorie / style / rodzaje ---------------

  protected readonly taxonomyKinds: TaxonomyKind[] = ['category', 'subcategory', 'style', 'type'];
  protected readonly taxonomyKindLabels = TAXONOMY_KIND_LABELS;

  protected readonly showTaxonomy = signal(false);
  protected readonly taxonomySubmitting = signal(false);
  protected readonly taxonomyError = signal<string | null>(null);

  protected readonly taxonomyForm = this.formBuilder.group({
    kind: this.formBuilder.control<TaxonomyKind>('subcategory', Validators.required),
    label: ['', Validators.required],
    slug: [''],
    parent_slug: [''],
  });

  private readonly taxonomyKind = signal<TaxonomyKind>('subcategory');
  private readonly taxonomySlug = signal('');
  /** Dopóki admin nie tknie pola adresu, podpowiadamy je z nazwy. */
  private slugEditedByHand = false;

  protected readonly taxonomyNeedsParent = computed(() => this.taxonomyKind() === 'subcategory');
  protected readonly taxonomySlugPreview = computed(() => slugify(this.taxonomySlug()));

  protected readonly taxonomyGroups = computed(() =>
    this.taxonomyKinds.map((kind) => ({
      kind,
      label: TAXONOMY_KIND_LABELS[kind],
      entries: this.taxonomy.entries().filter((entry) => entry.kind === kind),
    })),
  );

  protected toggleTaxonomy(): void {
    this.showTaxonomy.update((open) => !open);
    this.taxonomyError.set(null);
  }

  protected taxonomyParentLabel(entry: TaxonomyEntry): string {
    return entry.parent_slug
      ? (this.taxonomy.findMainCategory(entry.parent_slug)?.label ?? entry.parent_slug)
      : '';
  }

  /** Ile produktów wisi na wpisie — nie pozwalamy usunąć używanego slugu. */
  protected taxonomyUsage(entry: TaxonomyEntry): number {
    const products = this.productsService.products() ?? [];
    switch (entry.kind) {
      case 'category':
        return products.filter((product) => product.category === entry.slug).length;
      case 'subcategory':
        return products.filter((product) => product.subcategory === entry.slug).length;
      case 'style':
        return products.filter((product) => product.styles?.includes(entry.slug)).length;
      case 'type':
        return products.filter((product) => product.types?.includes(entry.slug)).length;
    }
  }

  protected async addTaxonomy(): Promise<void> {
    if (this.taxonomyForm.invalid) {
      this.taxonomyForm.markAllAsTouched();
      return;
    }

    const values = this.taxonomyForm.getRawValue();
    const slug = slugify(values.slug || values.label);

    if (!slug) {
      this.taxonomyError.set('Adres musi zawierać litery lub cyfry.');
      return;
    }
    if (/[^a-z0-9-]/.test(slug)) {
      this.taxonomyError.set('Adres może zawierać tylko małe litery, cyfry i myślniki.');
      return;
    }
    if (values.kind === 'subcategory' && !values.parent_slug) {
      this.taxonomyError.set('Wybierz kategorię nadrzędną dla podkategorii.');
      return;
    }

    this.taxonomySubmitting.set(true);
    this.taxonomyError.set(null);

    try {
      await this.taxonomy.create({
        kind: values.kind,
        slug,
        label: values.label.trim(),
        parent_slug: values.kind === 'subcategory' ? values.parent_slug : null,
      });
      this.slugEditedByHand = false;
      this.taxonomyForm.patchValue({ label: '', slug: '' }, { emitEvent: false });
      this.taxonomySlug.set('');
    } catch (error) {
      this.taxonomyError.set(error instanceof Error ? error.message : 'Nie udało się dodać wpisu.');
    } finally {
      this.taxonomySubmitting.set(false);
    }
  }

  protected async renameTaxonomy(entry: TaxonomyEntry): Promise<void> {
    const label = prompt(`Nowa nazwa dla „${entry.label}”:`, entry.label)?.trim();
    if (!label || label === entry.label) {
      return;
    }
    this.taxonomyError.set(null);
    try {
      await this.taxonomy.rename(entry.id, label);
    } catch (error) {
      this.taxonomyError.set(
        error instanceof Error ? error.message : 'Nie udało się zmienić nazwy.',
      );
    }
  }

  protected async removeTaxonomy(entry: TaxonomyEntry): Promise<void> {
    const usage = this.taxonomyUsage(entry);
    if (usage > 0) {
      this.taxonomyError.set(
        `Nie można usunąć „${entry.label}” — korzysta z tego wpisu ${usage} produkt(ów). Najpierw przepnij je gdzie indziej.`,
      );
      return;
    }
    if (!confirm(`Usunąć „${entry.label}”?`)) {
      return;
    }
    this.taxonomyError.set(null);
    try {
      await this.taxonomy.remove(entry.id);
    } catch (error) {
      this.taxonomyError.set(
        error instanceof Error ? error.message : 'Nie udało się usunąć wpisu.',
      );
    }
  }

  protected categoryLabelOf(product: Collection): string {
    return this.taxonomy.findMainCategory(product.category)?.label ?? '—';
  }

  protected openCreate(): void {
    this.resetMedia();
    this.editingId.set(null);
    this.formError.set(null);
    this.selectedStyles.set([]);
    this.selectedTypes.set([]);
    this.optionDrafts.set({
      paper: draftsFrom('paper', undefined),
      foil: draftsFrom('foil', undefined),
      envelope: draftsFrom('envelope', undefined),
    });
    this.printEnabled.set(false);
    this.printDrafts.set(this.buildPrintDrafts(undefined));
    this.categoryValue.set('invitations');
    this.form.reset({
      name: '',
      description: '',
      full_description: '',
      price: 0,
      badge: '',
      category: 'invitations',
      subcategory: '',
      is_new: false,
      is_bestseller: false,
      is_promo: false,
      is_featured: false,
    });
    this.showForm.set(true);
  }

  protected openEdit(product: Collection): void {
    this.resetMedia();
    this.editingId.set(product.id);
    this.formError.set(null);

    this.mainImagePath.set(product.image);
    this.mainPreviewUrl.set(this.productsService.imageUrl(product.image));
    this.gallery.set(
      (product.images ?? []).map((path) => ({
        path,
        previewUrl: this.productsService.imageUrl(path) ?? '',
      })),
    );

    this.selectedStyles.set([...(product.styles ?? [])]);
    this.selectedTypes.set([...(product.types ?? [])]);
    this.optionDrafts.set({
      paper: draftsFrom('paper', product.paper_options),
      foil: draftsFrom('foil', product.foil_options),
      envelope: draftsFrom('envelope', product.envelope_options),
    });
    this.printEnabled.set(!!product.envelope_print?.enabled);
    this.printDrafts.set(this.buildPrintDrafts(product));

    this.categoryValue.set(product.category ?? 'invitations');
    this.form.reset({
      name: product.name,
      description: product.description,
      full_description: product.full_description ?? '',
      price: product.price,
      badge: product.badge ?? '',
      category: product.category ?? 'invitations',
      subcategory: product.subcategory ?? '',
      is_new: !!product.is_new,
      is_bestseller: !!product.is_bestseller,
      is_promo: !!product.is_promo,
      is_featured: !!product.is_featured,
    });
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
  }

  private buildPrintDrafts(product: Collection | undefined): PrintDraft[] {
    return ENVELOPE_PRINT_OPTIONS.map((option) => {
      const override = product?.envelope_print?.overrides?.[option.id];
      return {
        id: option.id,
        label: option.label,
        price: override?.price ?? option.price,
        image: override?.image,
        file: null,
        previewUrl: this.productsService.imageUrl(override?.image),
      };
    });
  }

  private resetMedia(): void {
    this.mainImagePath.set(undefined);
    this.mainImageFile.set(null);
    this.mainPreviewUrl.set(undefined);
    this.gallery.set([]);
  }

  protected onMainFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.setMainFile(file);
  }

  protected onFileDragOver(event: DragEvent): void {
    event.preventDefault();
    this.draggingFile.set(true);
  }

  protected onFileDragLeave(): void {
    this.draggingFile.set(false);
  }

  protected onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.draggingFile.set(false);
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (file?.type.startsWith('image/')) {
      this.setMainFile(file);
    }
  }

  private setMainFile(file: File | null): void {
    if (!file) {
      return;
    }
    this.mainImageFile.set(file);
    this.mainPreviewUrl.set(URL.createObjectURL(file));
  }

  protected onGalleryFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).filter((file) => file.type.startsWith('image/'));
    if (files.length) {
      this.gallery.update((entries) => [
        ...entries,
        ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
      ]);
    }
    input.value = '';
  }

  protected removeGalleryEntry(index: number): void {
    this.gallery.update((entries) => entries.filter((_, position) => position !== index));
  }

  protected onPrintFileSelected(event: Event, id: EnvelopePrintId): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (!file?.type.startsWith('image/')) {
      return;
    }
    this.printDrafts.update((drafts) =>
      drafts.map((draft) =>
        draft.id === id ? { ...draft, file, previewUrl: URL.createObjectURL(file) } : draft,
      ),
    );
  }

  protected setPrintPrice(id: EnvelopePrintId, value: number): void {
    this.printDrafts.update((drafts) =>
      drafts.map((draft) => (draft.id === id ? { ...draft, price: value || 0 } : draft)),
    );
  }

  protected toggleStyle(slug: string): void {
    this.selectedStyles.update((slugs) =>
      slugs.includes(slug) ? slugs.filter((entry) => entry !== slug) : [...slugs, slug],
    );
  }

  protected toggleType(slug: string): void {
    this.selectedTypes.update((slugs) =>
      slugs.includes(slug) ? slugs.filter((entry) => entry !== slug) : [...slugs, slug],
    );
  }

  protected toggleOption(group: OptionGroup, id: string): void {
    this.optionDrafts.update((drafts) => ({
      ...drafts,
      [group]: drafts[group].map((draft) =>
        draft.id === id ? { ...draft, enabled: !draft.enabled } : draft,
      ),
    }));
  }

  protected setOptionPrice(group: OptionGroup, id: string, value: number): void {
    this.optionDrafts.update((drafts) => ({
      ...drafts,
      [group]: drafts[group].map((draft) =>
        draft.id === id ? { ...draft, price: value || 0 } : draft,
      ),
    }));
  }

  private optionsFor(group: OptionGroup): ProductOption[] | undefined {
    const enabled = this.optionDrafts()
      [group].filter((draft) => draft.enabled)
      .map(({ id, label, price, swatch }) => ({ id, label, price, swatch }));
    return enabled.length ? enabled : undefined;
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.formError.set(null);

    try {
      const values = this.form.getRawValue();

      const mainFile = this.mainImageFile();
      const image = mainFile
        ? await this.productsService.uploadImage(mainFile)
        : this.mainImagePath();

      const images: string[] = [];
      for (const entry of this.gallery()) {
        images.push(entry.file ? await this.productsService.uploadImage(entry.file) : entry.path!);
      }

      const overrides: Record<string, { price: number; image?: string }> = {};
      if (this.printEnabled()) {
        for (const draft of this.printDrafts()) {
          overrides[draft.id] = {
            price: draft.price,
            image: draft.file ? await this.productsService.uploadImage(draft.file) : draft.image,
          };
        }
      }

      const classified = this.showClassification();
      const input: ProductInput = {
        name: values.name,
        description: values.description,
        full_description: values.full_description || undefined,
        price: values.price,
        badge: values.badge || undefined,
        image,
        images,
        category: values.category,
        subcategory: values.subcategory || undefined,
        styles: classified ? this.selectedStyles() : [],
        types: classified ? this.selectedTypes() : [],
        is_new: values.is_new,
        is_bestseller: values.is_bestseller,
        is_promo: values.is_promo,
        is_featured: values.is_featured,
        paper_options: this.optionsFor('paper'),
        foil_options: this.optionsFor('foil'),
        envelope_options: this.optionsFor('envelope'),
        envelope_print: this.printEnabled() ? { enabled: true, overrides } : { enabled: false },
      };

      const id = this.editingId();
      if (id) {
        await this.productsService.update(id, input);
      } else {
        await this.productsService.create(input);
      }
      this.showForm.set(false);
    } catch (error) {
      this.formError.set(
        error instanceof Error ? error.message : 'Nie udało się zapisać produktu.',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  protected async remove(product: Collection): Promise<void> {
    if (!confirm(`Usunąć produkt „${product.name}”?`)) {
      return;
    }
    this.deleteError.set(null);
    try {
      await this.productsService.remove(product.id);
    } catch (error) {
      this.deleteError.set(
        error instanceof Error ? error.message : 'Nie udało się usunąć produktu.',
      );
    }
  }
}
