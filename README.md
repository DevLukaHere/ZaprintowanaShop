# ZaprintowanaShop

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.0.7.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Dane sprzedawcy w dokumentach prawnych

Regulamin, Polityka prywatności i klauzula RODO (`/terms`, `/privacy-policy`, `/gdpr`) biorą
dane sprzedawcy z jednego pliku: [`src/app/models/legal.ts`](src/app/models/legal.ts).
Dokumenty są napisane pod **działalność nierejestrowaną** (art. 5 Prawa przedsiębiorców) —
sprzedawcą jest osoba fizyczna, bez NIP-u i REGON-u, ale z pełnym zakresem obowiązków wobec
konsumenta.

Wartości w nawiasach kwadratowych (`[IMIĘ I NAZWISKO]`, `[ULICA I NUMER]`, `[NUMER TELEFONU]`,
`[NUMER RACHUNKU BANKOWEGO]`…) trzeba uzupełnić przed publicznym uruchomieniem sklepu.
Dopóki tam zostaną, każda ze stron prawnych wyświetla czerwone ostrzeżenie z listą brakujących
pól — po podmianie znika ono samo.

Datę wejścia w życie dokumentów ustawia stała `LEGAL_UPDATED_AT` w tym samym pliku.

## Dostawa i kupony rabatowe

Sposoby dostawy (`shipping_methods`) i kupony (`discount_coupons`) redaguje się w panelu:
**Panel → Dostawa i kupony** (`/admin/shipping`). Cennik dostawy widoczny w Regulaminie
pobiera się z tej samej tabeli co koszyk, więc nie da się go rozjechać.

Koszt dostawy i wysokość rabatu wylicza baza w funkcji `create_order` — przeglądarka przysyła
tylko kod metody i kod kuponu. Zamówienie zapamiętuje nazwę i cenę metody z chwili zakupu, więc
późniejsza zmiana cennika nie przepisuje historii.

## Blokada sklepu na czas developmentu

Dopóki `SITE_LOCKED` jest włączone, **każda** strona sklepu wymaga zalogowania na konto
administratora — wejście na dowolny adres odsyła do `/admin/login`, a po zalogowaniu
wraca tam, dokąd się szło. Blokadę nakłada [`siteLockGuard`](src/app/guards/site-lock.guard.ts),
dopinany do wszystkich tras publicznych jednym mapowaniem w [`app.routes.ts`](src/app/app.routes.ts),
więc nowa strona jest chroniona automatycznie — nie da się o niej zapomnieć.

Domyślnie blokada jest **włączona**: brak `SITE_LOCKED` w `.env` traktujemy jak `true`,
żeby zapomniana zmienna nie otworzyła sklepu światu. Dodatkowo, dopóki trwa, aplikacja
dokłada `<meta name="robots" content="noindex, nofollow">`.

Otwarcie sklepu — jedna linijka w `.env`, bez zmian w kodzie:

```
SITE_LOCKED=false
```

Potem `npm run build` (albo `npm run deploy`) — `generate-env` wypisuje w konsoli, w którym
trybie zbudował aplikację.

Uwaga: blokada zatrzymuje przypadkowego gościa, ale nie jest zabezpieczeniem danych.
Aplikacja jest statyczna, więc jej kod pobierze każdy, kto zna adres. Zamówień i wiadomości
pilnują reguły RLS w bazie, a nie ten guard. Blokada obejmuje też formularz `/order/:token` —
jeśli przed startem trzeba wysłać ten link prawdziwemu klientowi, najpierw wyłącz `SITE_LOCKED`.
