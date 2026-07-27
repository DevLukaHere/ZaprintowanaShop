import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminHeader } from '../../components/admin-header/admin-header';
import { COLLECTION_THEMES, Collection, ProductInput } from '../../models/collection';
import { AdminProductsService } from '../../services/admin-products.service';

@Component({
  selector: 'app-admin-products',
  imports: [ReactiveFormsModule, AdminHeader],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.scss',
})
export class AdminProductsPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly productsService = inject(AdminProductsService);
  protected readonly themes = COLLECTION_THEMES;

  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly previewUrl = signal<string | undefined>(undefined);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly deleteError = signal<string | null>(null);

  private selectedFile: File | null = null;

  protected readonly form = this.formBuilder.group({
    name: ['', Validators.required],
    description: ['', Validators.required],
    price: ['', Validators.required],
    badge: [''],
    theme: this.formBuilder.control<Collection['theme']>('sage', Validators.required),
  });

  protected isInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && control.touched;
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.selectedFile = null;
    this.previewUrl.set(undefined);
    this.formError.set(null);
    this.form.reset({ name: '', description: '', price: '', badge: '', theme: 'sage' });
    this.showForm.set(true);
  }

  protected openEdit(product: Collection): void {
    this.editingId.set(product.id);
    this.selectedFile = null;
    this.previewUrl.set(this.productsService.imageUrl(product.image));
    this.formError.set(null);
    this.form.reset({
      name: product.name,
      description: product.description,
      price: product.price,
      badge: product.badge ?? '',
      theme: product.theme,
    });
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
  }

  protected onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.selectedFile = file;
    this.previewUrl.set(file ? URL.createObjectURL(file) : undefined);
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, description, price, badge, theme } = this.form.getRawValue();
    const input: ProductInput = {
      name,
      description,
      price,
      theme,
      badge: badge || undefined,
    };

    this.submitting.set(true);
    this.formError.set(null);
    try {
      const id = this.editingId();
      if (id) {
        await this.productsService.update(id, input, this.selectedFile);
      } else {
        await this.productsService.create(input, this.selectedFile);
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
