import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminHeader } from '../../components/admin-header/admin-header';
import {
  MAIN_CATEGORIES,
  MainCategory,
  PRODUCT_STYLES,
  PRODUCT_TYPES,
  findMainCategory,
} from '../../models/category';
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

  protected readonly mainCategories = MAIN_CATEGORIES;
  protected readonly allStyles = PRODUCT_STYLES;
  protected readonly allTypes = PRODUCT_TYPES;
  protected readonly optionGroups = OPTION_GROUPS;
  protected readonly optionGroupLabels = OPTION_GROUP_LABELS;

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
    category: this.formBuilder.control<MainCategory>('zaproszenia', Validators.required),
    subcategory: [''],
    is_new: [false],
    is_bestseller: [false],
  });

  private readonly categoryValue = signal<MainCategory>('zaproszenia');

  protected readonly subcategories = computed(
    () => findMainCategory(this.categoryValue())?.subcategories ?? [],
  );

  protected readonly showClassification = computed(
    () => findMainCategory(this.categoryValue())?.filterable ?? false,
  );

  constructor() {
    this.form.controls.category.valueChanges.subscribe((value) => {
      this.categoryValue.set(value);
      if (!this.subcategories().some((sub) => sub.slug === this.form.controls.subcategory.value)) {
        this.form.controls.subcategory.setValue('');
      }
    });
  }

  protected categoryLabelOf(product: Collection): string {
    return findMainCategory(product.category)?.label ?? '—';
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
    this.categoryValue.set('zaproszenia');
    this.form.reset({
      name: '',
      description: '',
      full_description: '',
      price: 0,
      badge: '',
      category: 'zaproszenia',
      subcategory: '',
      is_new: false,
      is_bestseller: false,
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

    this.categoryValue.set(product.category ?? 'zaproszenia');
    this.form.reset({
      name: product.name,
      description: product.description,
      full_description: product.full_description ?? '',
      price: product.price,
      badge: product.badge ?? '',
      category: product.category ?? 'zaproszenia',
      subcategory: product.subcategory ?? '',
      is_new: !!product.is_new,
      is_bestseller: !!product.is_bestseller,
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
    const enabled = this.optionDrafts()[group]
      .filter((draft) => draft.enabled)
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
            image: draft.file
              ? await this.productsService.uploadImage(draft.file)
              : draft.image,
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
