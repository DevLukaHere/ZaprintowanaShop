import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Footer } from '../../components/footer/footer';
import { Navbar } from '../../components/navbar/navbar';
import {
  LEGAL_UPDATED_AT,
  SELLER,
  fullSellerAddress,
  hasPlaceholders,
  placeholderFields,
} from '../../models/legal';

/** Jedno miejsce w sklepie, w którym zbieramy dane — jedna klauzula informacyjna. */
interface CollectionPoint {
  title: string;
  where: string;
  data: string;
  purpose: string;
  basis: string;
  required: string;
  period: string;
}

interface DataRight {
  name: string;
  article: string;
  description: string;
}

@Component({
  selector: 'app-gdpr',
  imports: [RouterLink, Navbar, Footer],
  templateUrl: './gdpr.html',
  styleUrl: '../legal.scss',
})
export class GdprPage {
  protected readonly seller = SELLER;
  protected readonly sellerAddress = fullSellerAddress();
  protected readonly updatedAt = LEGAL_UPDATED_AT;
  protected readonly hasPlaceholders = hasPlaceholders;
  protected readonly placeholderFields = placeholderFields.join(', ');

  protected readonly collectionPoints: CollectionPoint[] = [
    {
      title: 'Zamówienie w sklepie',
      where: 'formularz zamówienia',
      data: 'imię i nazwisko, adres dostawy, e-mail, telefon, punkt odbioru, uwagi, wybrany sposób dostawy i płatności',
      purpose: 'zawarcie i wykonanie umowy sprzedaży, wysyłka, kontakt w sprawie zamówienia',
      basis:
        'art. 6 ust. 1 lit. b RODO (wykonanie umowy); w zakresie rozliczeń — art. 6 ust. 1 lit. c RODO',
      required: 'podanie danych jest warunkiem zawarcia umowy — bez nich nie da się wysłać paczki',
      period: 'do przedawnienia roszczeń z umowy oraz przez okres wymagany przepisami podatkowymi',
    },
    {
      title: 'Dane do zaproszeń',
      where: 'formularz otwierany linkiem wysłanym po opłaceniu zamówienia',
      data: 'imiona, data i godzina uroczystości, adresy miejsc, treści dedykacji, opcjonalnie lista gości',
      purpose: 'przygotowanie projektu i wydruk zamówionych produktów',
      basis: 'art. 6 ust. 1 lit. b RODO (wykonanie umowy)',
      required: 'bez tych treści nie da się wykonać personalizowanego zamówienia',
      period: 'do 12 miesięcy od wysyłki zamówienia — na wypadek dodruku; wcześniej na żądanie',
    },
    {
      title: 'Formularz kontaktowy',
      where: 'strona „Kontakt”',
      data: 'imię i nazwisko, e-mail, telefon (opcjonalnie), temat i treść wiadomości',
      purpose: 'udzielenie odpowiedzi na zadane pytanie',
      basis:
        'art. 6 ust. 1 lit. f RODO — prawnie uzasadniony interes polegający na obsłudze zapytań',
      required: 'podanie danych jest dobrowolne, ale bez adresu e-mail nie odpiszemy',
      period: 'do zakończenia sprawy, maksymalnie 12 miesięcy',
    },
    {
      title: 'Reklamacja lub odstąpienie od umowy',
      where: 'e-mail lub list',
      data: 'dane zamówienia, opis problemu, numer rachunku do zwrotu',
      purpose: 'rozpatrzenie zgłoszenia i rozliczenie zwrotu',
      basis:
        'art. 6 ust. 1 lit. c RODO (obowiązek prawny) oraz art. 6 ust. 1 lit. f RODO (obrona przed roszczeniami)',
      required: 'podanie danych jest niezbędne do rozpatrzenia zgłoszenia',
      period:
        'do końca okresu odpowiedzialności za zgodność towaru z umową i przedawnienia roszczeń',
    },
  ];

  protected readonly rights: DataRight[] = [
    {
      name: 'Dostęp do danych',
      article: 'art. 15 RODO',
      description:
        'Możecie zapytać, jakie dane o Was mamy, i dostać ich kopię. Odpowiadamy w ciągu miesiąca.',
    },
    {
      name: 'Sprostowanie',
      article: 'art. 16 RODO',
      description:
        'Literówka w nazwisku albo zmieniony adres — poprawiamy od ręki, wystarczy jeden e-mail.',
    },
    {
      name: 'Usunięcie („prawo do bycia zapomnianym”)',
      article: 'art. 17 RODO',
      description:
        'Usuwamy dane, gdy nie są już potrzebne. Nie dotyczy danych, które musimy zachować z powodu obowiązków podatkowych lub trwającego zamówienia.',
    },
    {
      name: 'Ograniczenie przetwarzania',
      article: 'art. 18 RODO',
      description:
        'Możecie żądać, żebyśmy dane wyłącznie przechowywali — na przykład na czas wyjaśniania sporu.',
    },
    {
      name: 'Przenoszenie danych',
      article: 'art. 20 RODO',
      description:
        'Dane podane w zamówieniu wydajemy w pliku nadającym się do odczytu maszynowego albo przesyłamy wskazanemu podmiotowi.',
    },
    {
      name: 'Sprzeciw',
      article: 'art. 21 RODO',
      description:
        'Wobec przetwarzania opartego na naszym prawnie uzasadnionym interesie możecie wnieść sprzeciw — wtedy przestajemy, chyba że mamy ważne podstawy prawne.',
    },
    {
      name: 'Skarga do organu nadzorczego',
      article: 'art. 77 RODO',
      description:
        'Skargę składa się do Prezesa Urzędu Ochrony Danych Osobowych, ul. Stawki 2, 00-193 Warszawa.',
    },
  ];
}
