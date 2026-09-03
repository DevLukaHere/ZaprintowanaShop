# Poczta transakcyjna

## Dlaczego Edge Function, a nie ustawienia SMTP w Supabase

Pole **Authentication → Emails → SMTP Settings** w panelu Supabase obsługuje wyłącznie
maile autoryzacyjne: potwierdzenie rejestracji, magic link, reset hasła. Nie da się przez
nie wysłać własnej wiadomości do klienta. Maile transakcyjne — potwierdzenie zamówienia,
potwierdzenie płatności, link do formularza — muszą iść z Edge Function, która korzysta
z zewnętrznego dostawcy.

Funkcja `send-order-email` obsługuje dwa warianty. Wystarczy skonfigurować jeden.

## `SITE_URL` — bez własnej domeny też działa

`SITE_URL` to po prostu adres, pod którym stoi sklep. Na GitHub Pages aplikacja siedzi
w podkatalogu (build ustawia `--base-href /ZaprintowanaShop/`), więc podkatalog musi
znaleźć się w adresie — inaczej link z maila trafi w 404:

```
SITE_URL="https://devlukahere.github.io/ZaprintowanaShop"
```

Po przepięciu na własną domenę wystarczy podmienić ten jeden sekret.

## Wariant A — Resend (rekomendowany)

1. Załóż konto na [resend.com](https://resend.com) i dodaj domenę `zaprintowana.pl`.
2. Wpisz w DNS rekordy, które pokaże Resend (SPF, DKIM), i poczekaj na weryfikację.
   Bez zweryfikowanej domeny maile albo nie wyjdą, albo trafią do spamu.
3. Wygeneruj klucz API (`Full access` wystarczy dla nadawania).
4. Ustaw sekrety projektu:

```bash
npx supabase secrets set --project-ref pltuhiuemvjezrenoxcs \
  RESEND_API_KEY=re_xxx \
  MAIL_FROM="Zaprintowana <zamowienia@zaprintowana.pl>" \
  SITE_URL="https://zaprintowana.pl"
```

Adres w `MAIL_FROM` musi należeć do zweryfikowanej domeny.

### Bez domeny: tryb testowy Resend

Świeże konto Resend dostaje nadawcę `onboarding@resend.dev`, którego można użyć od ręki:

```bash
npx supabase secrets set --project-ref pltuhiuemvjezrenoxcs \
  RESEND_API_KEY=re_xxx \
  MAIL_FROM="Zaprintowana <onboarding@resend.dev>" \
  SITE_URL="https://devlukahere.github.io/ZaprintowanaShop"
```

Haczyk: w tym trybie Resend dostarcza **wyłącznie na adres e-mail właściciela konta**.
Wystarczy do przeklikania całego przepływu, ale do prawdziwych klientów trzeba albo
zweryfikowanej domeny, albo wariantu B poniżej.

## Wariant B — własny SMTP (działa bez kupowania domeny)

Jeśli macie już jakąkolwiek skrzynkę — firmową, Gmail, cokolwiek — możecie nadawać
przez nią. Nadawca musi być tym samym adresem, na który macie skrzynkę; wpisanie
w `MAIL_FROM` domeny, której nie kontrolujecie, kończy się spamem albo odrzuceniem.

Gmail wymaga włączonej weryfikacji dwuetapowej i **hasła aplikacji** (zwykłe hasło do
konta nie zadziała): `smtp.gmail.com`, port 465.

Zamiast `RESEND_API_KEY` ustaw:

```bash
npx supabase secrets set --project-ref pltuhiuemvjezrenoxcs \
  SMTP_HOST=smtp.twojhosting.pl \
  SMTP_PORT=465 \
  SMTP_USER=zamowienia@zaprintowana.pl \
  SMTP_PASSWORD='...' \
  MAIL_FROM="Zaprintowana <zamowienia@zaprintowana.pl>" \
  SITE_URL="https://zaprintowana.pl"
```

Port 465 oznacza połączenie szyfrowane od razu (`SMTP_TLS=true`, domyślne).
Dla portu 587 z STARTTLS ustaw dodatkowo `SMTP_TLS=false`.

## Sekrety opcjonalne

| Sekret | Znaczenie |
| --- | --- |
| `MAIL_BCC` | adres, na który idzie kopia każdego maila do klienta |
| `SMTP_TLS` | `false` dla portu 587 ze STARTTLS |

`SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY` Supabase wstrzykuje sam — nie ustawiaj ich ręcznie.

## Wdrożenie

```bash
npx supabase functions deploy send-order-email --project-ref pltuhiuemvjezrenoxcs
```

## Co i kiedy wysyła

| Zdarzenie | `kind` | Treść |
| --- | --- | --- |
| Klient składa zamówienie | `order-placed` | potwierdzenie przyjęcia, lista pozycji, zapowiedź formularza |
| Panel zmienia płatność na „Opłacone” | `payment-received` | potwierdzenie płatności i prywatny link do formularza z danymi do zaproszeń |

Oba maile wychodzą raz — funkcja stempluje `orders.order_placed_email_sent_at`
i `orders.payment_email_sent_at`, więc ponowne kliknięcie statusu w panelu nie
zasypie klienta powtórkami.

## Kiedy poczta nie jest skonfigurowana

Funkcja nie przerywa działania sklepu. Zwraca `{ sent: false, reason: "missing_mail_provider" }`,
zamówienie i zmiana statusu i tak się zapisują, a panel pokazuje przy zamówieniu gotowy
link do formularza — do skopiowania i wysłania ręcznie.

## Test po konfiguracji

```bash
curl -X POST "https://pltuhiuemvjezrenoxcs.supabase.co/functions/v1/send-order-email" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"<uuid zamówienia>","kind":"payment-received"}'
```

Odpowiedź `{"sent":true}` oznacza, że wiadomość poszła. Logi funkcji są w panelu
Supabase w zakładce **Edge Functions → send-order-email → Logs**.
