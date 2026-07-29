import { Component, input, model, signal } from '@angular/core';
import { EnvelopePrintId, EnvelopePrintOption } from '../../models/product-options';
import { PricePipe } from '../../pipes/price.pipe';

@Component({
  selector: 'app-envelope-print-picker',
  imports: [PricePipe],
  templateUrl: './envelope-print-picker.html',
  styleUrl: './envelope-print-picker.scss',
})
export class EnvelopePrintPicker {
  readonly options = input.required<readonly EnvelopePrintOption[]>();
  readonly selectedId = model<EnvelopePrintId | undefined>(undefined);

  protected readonly zoomed = signal<EnvelopePrintOption | null>(null);

  protected select(option: EnvelopePrintOption): void {
    this.selectedId.set(option.id);
  }

  protected openZoom(event: Event, option: EnvelopePrintOption): void {
    event.stopPropagation();
    this.zoomed.set(option);
  }

  protected closeZoom(): void {
    this.zoomed.set(null);
  }
}
