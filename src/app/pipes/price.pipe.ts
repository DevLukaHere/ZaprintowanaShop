import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'price',
})
export class PricePipe implements PipeTransform {
  transform(value: number | string, from = false): string {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(numeric)) {
      return typeof value === 'string' ? value : '';
    }
    const formatted = numeric % 1 === 0 ? numeric.toString() : numeric.toFixed(2).replace('.', ',');
    return from ? `od ${formatted} zł` : `${formatted} zł`;
  }
}
