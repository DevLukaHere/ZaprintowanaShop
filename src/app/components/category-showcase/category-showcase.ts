import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getProductImageUrl } from '../../core/supabase-client';
import { CatalogFilter, ProductsService } from '../../services/products.service';

interface ShowcaseEntry {
  title: string;
  description: string;
  /** Trasa do katalogu z odpowiednim filtrem. */
  commands: string[];
  queryParams?: Record<string, string>;
  /** Filtr używany do znalezienia zdjęcia zastępczego wśród produktów. */
  match: CatalogFilter;
  /** Ścieżka w buckecie `product-images` — dedykowane zdjęcie kategorii.
   *  Dopóki go nie ma, bierzemy zdjęcie pierwszego pasującego produktu. */
  image?: string;
}

const SHOWCASE_ENTRIES: readonly ShowcaseEntry[] = [
  {
    title: 'Zaproszenia glamour',
    description:
      'Złoto, głęboka czerń i wykończenia, które łapią światło. Zaproszenia glamour robią wrażenie, zanim gość zdąży je otworzyć — grube papiery, wyraziste kontrasty i dopracowane detale. Sprawdzą się na przyjęciu w sali z żyrandolami, przy wieczorowych kreacjach i motywie przewodnim w złocie lub butelkowej zieleni.',
    commands: ['/category', 'invitations'],
    queryParams: { styles: 'glamour' },
    match: { category: 'invitations', styles: ['glamour'] },
  },
  {
    title: 'Zaproszenia minimalistyczne',
    description:
      'Dużo światła, jeden akcent, żadnego zbędnego ornamentu. Minimalistyczne zaproszenia stawiają na typografię i dobry papier — czytelny układ tekstu, stonowaną paletę i fakturę, którą czuć pod palcami. Pasują do wesel w stylu skandynawskim, plenerowych ceremonii i par, które wolą prostotę od przepychu.',
    commands: ['/category', 'invitations'],
    queryParams: { styles: 'minimalist' },
    match: { category: 'invitations', styles: ['minimalist'] },
  },
  {
    title: 'Zaproszenia złocone',
    description:
      'Złocenie nakładamy na gorąco, więc wzór ma realny połysk i wypukłość — to nie jest nadruk imitujący metal. Złotem podkreślamy imiona, monogram albo gałązkę na obwolucie. Do wyboru złoto, srebro, różowe złoto i miedź, zawsze w komplecie z kopertą w dopasowanym kolorze.',
    commands: ['/category', 'invitations'],
    queryParams: { types: 'gilded' },
    match: { category: 'invitations', types: ['gilded'] },
  },
  {
    title: 'Winietki',
    description:
      'Winietka mówi gościowi, gdzie usiąść, a stołowi — jaki jest motyw przewodni wesela. Drukujemy je na tym samym papierze co zaproszenia i w tej samej typografii, z imieniem i nazwiskiem każdego gościa. Do wyboru wersja stojąca, składana i zawieszka na kieliszek.',
    commands: ['/category', 'extras', 'place-cards'],
    match: { category: 'extras', subcategory: 'place-cards' },
  },
  {
    title: 'Menu',
    description:
      'Karta menu porządkuje przyjęcie i domyka stylistykę zastawy. Mieścimy na niej pełny przebieg — od przystawek po tort i poprawiny — w układzie, który da się przeczytać przy świecach. Format dobieramy do wielkości stołu i liczby dań.',
    commands: ['/category', 'extras', 'menu'],
    match: { category: 'extras', subcategory: 'menu' },
  },
  {
    title: 'Numery stołów',
    description:
      'Numer stołu to pierwsza rzecz, której szuka gość po wejściu na salę. Drukujemy je w formacie widocznym z drugiego końca pomieszczenia, na sztywnym papierze lub dwustronnie do stojaka. Zamiast cyfr można użyć nazw — miast, piosenek, miejsc, które coś dla Was znaczą.',
    commands: ['/category', 'extras', 'table-numbers'],
    match: { category: 'extras', subcategory: 'table-numbers' },
  },
  {
    title: 'Podziękowania',
    description:
      'Podziękowania dla gości, rodziców i świadków — krótka forma, w której liczy się treść i papier. Przygotowujemy je w komplecie z resztą papeterii, z miejscem na odręczny dopisek albo z gotowym tekstem, który wspólnie dopracujemy przed drukiem.',
    commands: ['/category', 'extras', 'thank-you-cards'],
    match: { category: 'extras', subcategory: 'thank-you-cards' },
  },
];

@Component({
  selector: 'app-category-showcase',
  imports: [RouterLink],
  templateUrl: './category-showcase.html',
  styleUrl: './category-showcase.scss',
})
export class CategoryShowcase {
  private readonly productsService = inject(ProductsService);

  protected readonly entries = computed(() =>
    SHOWCASE_ENTRIES.map((entry) => ({
      ...entry,
      imageUrl: entry.image
        ? getProductImageUrl(entry.image)
        : this.productsService.filter(entry.match)[0]?.imageUrl,
    })),
  );
}
