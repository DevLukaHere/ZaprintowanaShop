/**
 * Dane sprzedawcy i daty dokumentów — jedno miejsce dla Regulaminu, Polityki
 * prywatności i klauzuli RODO.
 *
 * Sklep prowadzi działalność nierejestrowaną (art. 5 ustawy Prawo przedsiębiorców),
 * więc sprzedawcą jest osoba fizyczna: bez NIP-u, REGON-u i wpisu do CEIDG.
 * Nie zwalnia to z obowiązków wobec konsumenta — prawo odstąpienia od umowy,
 * odpowiedzialność za zgodność towaru z umową i RODO obowiązują tak samo.
 *
 * WARTOŚCI W NAWIASACH KWADRATOWYCH SĄ DO UZUPEŁNIENIA. Dopóki tam zostaną,
 * strony prawne pokazują ostrzeżenie, a `hasPlaceholders` jest `true`.
 */
export const SELLER = {
  /** Imię i nazwisko osoby prowadzącej sprzedaż. */
  name: '[IMIĘ I NAZWISKO]',
  /** Nazwa handlowa, pod którą występuje sklep. */
  tradeName: 'Zaprintowana',
  street: '[ULICA I NUMER]',
  postcode: '[00-000]',
  city: '[MIEJSCOWOŚĆ]',
  country: 'Polska',
  email: 'zaprintowanasklep@gmail.com',
  phone: '[NUMER TELEFONU]',
  bankAccount: '[NUMER RACHUNKU BANKOWEGO]',
  bankName: '[NAZWA BANKU]',
  domain: 'zaprintowana.pl',
  siteUrl: 'https://zaprintowana.pl',
} as const;

/** Data ostatniej aktualizacji dokumentów — pokazywana na każdej ze stron prawnych. */
export const LEGAL_UPDATED_AT = '4 września 2026';

/** Termin na odstąpienie od umowy, w dniach. */
export const WITHDRAWAL_DAYS = 14;

/** Termin na rozpatrzenie reklamacji, w dniach. */
export const COMPLAINT_RESPONSE_DAYS = 14;

/** Okres odpowiedzialności za brak zgodności towaru z umową, w latach. */
export const CONFORMITY_YEARS = 2;

export function fullSellerAddress(): string {
  return `${SELLER.street}, ${SELLER.postcode} ${SELLER.city}, ${SELLER.country}`;
}

function isPlaceholder(value: string): boolean {
  return value.startsWith('[') && value.endsWith(']');
}

/** Czy w danych sprzedawcy zostały jeszcze pola do uzupełnienia. */
export const hasPlaceholders = Object.values(SELLER).some(isPlaceholder);

/** Lista pól do uzupełnienia — panel i strony prawne pokazują ją wprost. */
export const placeholderFields = Object.entries(SELLER)
  .filter(([, value]) => isPlaceholder(value))
  .map(([key]) => key);
