export interface Collection {
  id: string;
  badge?: string;
  name: string;
  description: string;
  price: string;
  theme: 'sage' | 'slate' | 'blush' | 'cream' | 'wine' | 'charcoal';
  image?: string;
}

export const COLLECTIONS: Collection[] = [
  {
    id: 'kraft-minimal',
    name: 'Kraft Minimal',
    description: 'Kraftowa koperta i surowa, minimalistyczna typografia — prostota, która robi wrażenie',
    price: 'od 3,99 zł',
    theme: 'cream',
    image: '/products/1.png',
  },
  {
    id: 'golden-ribbon',
    badge: 'NOWOŚĆ',
    name: 'Golden Ribbon',
    description: 'Jedwabna wstążka, suszone kwiatki i złote zdobienia na kremowym papierze',
    price: 'od 5,49 zł',
    theme: 'blush',
    image: '/products/2.png',
  },
  {
    id: 'emerald-bloom',
    name: 'Emerald Bloom',
    description: 'Butelkowa zieleń koperty, lawendowe kwiaty i pieczęć z lakowego wosku',
    price: 'od 4,75 zł',
    theme: 'sage',
    image: '/products/3.png',
  },
  {
    id: 'burgundy-romance',
    name: 'Burgundy Romance',
    description: 'Głęboki bordowy wykrój z suszonymi kwiatami — romantyczny i wyrazisty',
    price: 'od 4,50 zł',
    theme: 'wine',
    image: '/products/4.png',
  },
  {
    id: 'amalfi-stamp',
    badge: 'BESTSELLER',
    name: 'Amalfi Stamp',
    description: 'Pocztówkowy design ze znaczkiem i cytrynowym akcentem — ślub w klimacie podróży',
    price: 'od 5,25 zł',
    theme: 'slate',
    image: '/products/5.png',
  },
  {
    id: 'lemon-grove',
    name: 'Lemon Grove',
    description: 'Szałwiowa koperta, różowa pieczęć i cytrynowy wzór na wykrojonej karcie',
    price: 'od 4,99 zł',
    theme: 'cream',
    image: '/products/6.png',
  },
  {
    id: 'monochrome-rose',
    name: 'Monochrome Rose',
    description: 'Czarno-biała elegancja, różany wzór, czarna wstążka i lakowa pieczęć',
    price: 'od 5,99 zł',
    theme: 'charcoal',
    image: '/products/7.png',
  },
  {
    id: 'sunflower-sage',
    name: 'Sunflower Sage',
    description: 'Grafitowa karta, słoneczniki i szałwiowa kokarda — ciepło późnego lata',
    price: 'od 4,60 zł',
    theme: 'sage',
    image: '/products/8.png',
  },
  {
    id: 'heart-cutout',
    name: 'Heart Cutout',
    description: 'Różowy wykrój w kształcie serca z suszonymi kwiatami — czysty romantyzm',
    price: 'od 4,10 zł',
    theme: 'blush',
    image: '/products/9.png',
  },
  {
    id: 'ivory-stack',
    name: 'Ivory Stack',
    description: 'Kremowe zaproszenia ze złotym brzegiem, kokardką i kwiatowym konfetti',
    price: 'od 3,80 zł',
    theme: 'cream',
    image: '/products/10.png',
  },
  {
    id: 'blush-notes',
    name: 'Blush Notes',
    description: 'Personalizowane karty z suszonymi kwiatami — poczuj klimat dnia ślubu',
    price: 'od 3,60 zł',
    theme: 'wine',
    image: '/products/11.png',
  },
  {
    id: 'newspaper-edition',
    badge: 'HIT',
    name: 'Newspaper Edition',
    description: 'Niebanalne zaproszenie w formie gazety — historia Waszej pary jak z filmu',
    price: 'od 6,50 zł',
    theme: 'charcoal',
    image: '/products/12.png',
  },
];
