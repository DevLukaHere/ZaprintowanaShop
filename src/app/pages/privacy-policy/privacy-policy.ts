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

interface Processor {
  name: string;
  role: string;
  location: string;
}

interface StorageEntry {
  key: string;
  purpose: string;
  lifetime: string;
}

@Component({
  selector: 'app-privacy-policy',
  imports: [RouterLink, Navbar, Footer],
  templateUrl: './privacy-policy.html',
  styleUrl: '../legal.scss',
})
export class PrivacyPolicyPage {
  protected readonly seller = SELLER;
  protected readonly sellerAddress = fullSellerAddress();
  protected readonly updatedAt = LEGAL_UPDATED_AT;
  protected readonly hasPlaceholders = hasPlaceholders;
  protected readonly placeholderFields = placeholderFields.join(', ');

  /** Podmioty, które mają dostęp do danych, bo sklep na nich stoi. */
  protected readonly processors: Processor[] = [
    {
      name: 'Supabase',
      role: 'baza danych zamówień i wiadomości, uwierzytelnianie panelu',
      location: 'Unia Europejska (Frankfurt)',
    },
    {
      name: 'GitHub Pages',
      role: 'hosting plików strony; w logach serwera pojawia się adres IP odwiedzającego',
      location: 'USA — na podstawie standardowych klauzul umownych',
    },
    {
      name: 'Dostawca poczty (Resend lub serwer SMTP sklepu)',
      role: 'wysyłka potwierdzeń zamówienia, potwierdzeń płatności i linku do formularza',
      location: 'Unia Europejska / USA — na podstawie standardowych klauzul umownych',
    },
    {
      name: 'Przewoźnicy (InPost, Orlen Paczka, Poczta Polska, DPD i pozostali wybrani w koszyku)',
      role: 'doręczenie przesyłki — imię, nazwisko, adres, telefon, e-mail',
      location: 'Polska',
    },
    {
      name: 'Bank prowadzący rachunek sprzedawcy',
      role: 'rozliczenie płatności',
      location: 'Polska',
    },
  ];

  /** To, co sklep zapisuje w przeglądarce. Ciasteczek marketingowych nie ma. */
  protected readonly storageEntries: StorageEntry[] = [
    {
      key: 'zaprintowana:cart:v3',
      purpose: 'zawartość koszyka — bez tego koszyk znika przy odświeżeniu strony',
      lifetime: 'do wyczyszczenia koszyka lub danych przeglądarki',
    },
    {
      key: 'zaprintowana:wishlist',
      purpose: 'lista ulubionych produktów',
      lifetime: 'do usunięcia z listy lub wyczyszczenia danych przeglądarki',
    },
    {
      key: 'sb-…-auth-token',
      purpose: 'sesja logowania do panelu administracyjnego — dotyczy wyłącznie sprzedawcy',
      lifetime: 'do wylogowania',
    },
  ];
}
