import { Component, computed, input, model } from '@angular/core';
import { ProductOption } from '../../models/product-options';
import { PricePipe } from '../../pipes/price.pipe';

@Component({
  selector: 'app-option-picker',
  imports: [PricePipe],
  templateUrl: './option-picker.html',
  styleUrl: './option-picker.scss',
})
export class OptionPicker {
  readonly label = input.required<string>();
  readonly options = input.required<readonly ProductOption[]>();
  readonly selectedId = model<string | undefined>(undefined);

  protected readonly selected = computed(() =>
    this.options().find((option) => option.id === this.selectedId()),
  );

  protected select(option: ProductOption): void {
    this.selectedId.set(this.selectedId() === option.id ? undefined : option.id);
  }
}
