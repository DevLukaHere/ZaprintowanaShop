import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TaxonomyService } from '../../services/taxonomy.service';

@Component({
  selector: 'app-category-bar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './category-bar.html',
  styleUrl: './category-bar.scss',
})
export class CategoryBar {
  private readonly taxonomy = inject(TaxonomyService);

  readonly category = input<string | undefined>(undefined);

  protected readonly main = computed(() => this.taxonomy.findMainCategory(this.category()));
  protected readonly mainCategories = this.taxonomy.mainCategories;
}
