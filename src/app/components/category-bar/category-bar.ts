import { Component, computed, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MAIN_CATEGORIES, findMainCategory } from '../../models/category';

@Component({
  selector: 'app-category-bar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './category-bar.html',
  styleUrl: './category-bar.scss',
})
export class CategoryBar {
  readonly category = input<string | undefined>(undefined);

  protected readonly main = computed(() => findMainCategory(this.category()));
  protected readonly mainCategories = MAIN_CATEGORIES;
}
