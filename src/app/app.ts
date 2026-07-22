import { Component } from '@angular/core';

interface Collection {
  labelNumber: string;
  badge?: string;
  name: string;
  description: string;
  price: string;
  theme: 'emerald' | 'midnight' | 'blush';
}

interface Feature {
  stat: string;
  label: string;
  description: string;
}

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly collections: Collection[] = [
    {
      labelNumber: 'KOLEJ. 01',
      name: 'Emerald Night',
      description: 'Głębokie zielenie, złote akcenty, geometryczne wzory na papierze Vellum',
      price: 'od 4,99 zł',
      theme: 'emerald',
    },
    {
      labelNumber: 'KOLEJ. 02',
      badge: 'BESTSELLER',
      name: 'Midnight Luxe',
      description: 'Klasyczna elegancja czerni i złota. Art deco z nowoczesnym twist',
      price: 'od 3,49 zł',
      theme: 'midnight',
    },
    {
      labelNumber: 'KOLEJ. 03',
      name: 'Blush Deco',
      description: 'Subtelny róż z geometrycznymi liniami złota i perły',
      price: 'od 4,25 zł',
      theme: 'blush',
    },
  ];

  protected readonly features: Feature[] = [
    {
      stat: '100%',
      label: 'Rzemiosło',
      description: 'Ręczne wykończenie każdej karty',
    },
    {
      stat: '∞',
      label: 'Personalizacja',
      description: 'Bez limitów na zmiany i dostosowania',
    },
    {
      stat: '✦',
      label: 'Premium',
      description: 'Papiery najwyższej klasy',
    },
  ];
}
