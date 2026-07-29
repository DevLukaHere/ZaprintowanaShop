export interface ProductOption {
  id: string;
  label: string;
  price: number;
  swatch?: string;
  image?: string;
}

export type OptionGroup = 'paper' | 'foil' | 'envelope';

export const OPTION_GROUP_LABELS: Record<OptionGroup, string> = {
  paper: 'Papier',
  foil: 'Folia',
  envelope: 'Koperta',
};

export const PAPER_PRESETS: readonly ProductOption[] = [
  { id: 'textured-watercolour', label: 'Fakturowany akwarelowy', price: 0, swatch: '#f3ece2' },
  { id: 'textured-linen', label: 'Fakturowany lniany', price: 0, swatch: '#efe7da' },
  { id: 'plain-white', label: 'Biały gładki', price: 0, swatch: '#ffffff' },
];

export const ENVELOPE_COLOUR_PRESETS: readonly ProductOption[] = [
  { id: 'white', label: 'Biały', price: 0, swatch: '#ffffff' },
  { id: 'ecru', label: 'Ecru', price: 0, swatch: '#f2e8d5' },
  { id: 'kraft', label: 'Kraft', price: 0, swatch: '#c8a781' },
  { id: 'powder-pink', label: 'Pudrowy róż', price: 0, swatch: '#e9cbd6' },
  { id: 'sage', label: 'Szałwiowy', price: 0, swatch: '#a9b78c' },
  { id: 'navy', label: 'Granatowy', price: 0, swatch: '#2f3d55' },
  { id: 'burgundy', label: 'Bordowy', price: 0, swatch: '#6b2338' },
  { id: 'graphite', label: 'Grafitowy', price: 0, swatch: '#3a3530' },
];

export const FOIL_PRESETS: readonly ProductOption[] = [
  { id: 'gold', label: 'Złota', price: 0, swatch: '#c9a227' },
  { id: 'silver', label: 'Srebrna', price: 0, swatch: '#c0c0c0' },
  { id: 'rose-gold', label: 'Różowe złoto', price: 0, swatch: '#d8a29a' },
  { id: 'copper', label: 'Miedziana', price: 0, swatch: '#b87333' },
];

export const OPTION_PRESETS: Record<OptionGroup, readonly ProductOption[]> = {
  paper: PAPER_PRESETS,
  foil: FOIL_PRESETS,
  envelope: ENVELOPE_COLOUR_PRESETS,
};

export type EnvelopePrintId = 'flap' | 'front' | 'flap-front';

export interface EnvelopePrintOption {
  id: EnvelopePrintId;
  label: string;
  description: string;
  price: number;
  image?: string;
  requiresText: boolean;
  requiresGuestList: boolean;
}

export const ENVELOPE_TEXT_MAX_LENGTH = 50;

export const ENVELOPE_PRINT_OPTIONS: readonly EnvelopePrintOption[] = [
  {
    id: 'flap',
    label: 'Nadruk na klapie koperty',
    description: 'Np. „pobieramy się Anna i Piotr”. Treść wpisujesz samodzielnie.',
    price: 2,
    requiresText: true,
    requiresGuestList: false,
  },
  {
    id: 'front',
    label: 'Nadruk na przodzie koperty',
    description: 'Personalizacja gości — imiona i nazwiska drukujemy na kopercie.',
    price: 3,
    requiresText: false,
    requiresGuestList: true,
  },
  {
    id: 'flap-front',
    label: 'Nadruk na klapie + personalizacja',
    description: 'Połączenie obu wariantów — tekst na klapie i goście na przodzie.',
    price: 4,
    requiresText: true,
    requiresGuestList: true,
  },
];

export interface EnvelopePrintConfig {
  enabled: boolean;
  overrides?: Partial<Record<EnvelopePrintId, { price?: number; image?: string }>>;
}

export function resolveEnvelopePrintOptions(
  config: EnvelopePrintConfig | undefined,
): EnvelopePrintOption[] {
  if (!config?.enabled) {
    return [];
  }
  return ENVELOPE_PRINT_OPTIONS.map((option) => {
    const override = config.overrides?.[option.id];
    return {
      ...option,
      price: override?.price ?? option.price,
      image: override?.image ?? option.image,
    };
  });
}

export interface PersonalisationField {
  key: string;
  label: string;
  maxLength: number;
  multiline?: boolean;
}

export const PERSONALISATION_FIELDS: readonly PersonalisationField[] = [
  { key: 'couple', label: 'Imiona pary młodej', maxLength: 80 },
  { key: 'date', label: 'Data uroczystości', maxLength: 40 },
  { key: 'time', label: 'Godzina ceremonii', maxLength: 20 },
  { key: 'ceremonyVenue', label: 'Miejsce ceremonii', maxLength: 120 },
  { key: 'receptionVenue', label: 'Miejsce przyjęcia', maxLength: 120 },
  { key: 'additionalInfo', label: 'Dodatkowe informacje', maxLength: 300, multiline: true },
];

export interface ProductConfiguration {
  paperId?: string;
  foilId?: string;
  envelopeId?: string;
  guestPersonalisation: boolean;
  envelopePrintId?: EnvelopePrintId;
  envelopeText?: string;
  express: boolean;
  personalisation?: Record<string, string>;
}

export function emptyConfiguration(): ProductConfiguration {
  return { guestPersonalisation: false, express: false, personalisation: {} };
}
