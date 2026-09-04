/**
 * Wysyłka maili transakcyjnych do klienta i powiadomień do właściciela sklepu.
 *
 * Supabase nie ma wbudowanej wysyłki poczty dla własnych maili — ustawienia SMTP
 * w panelu obsługują wyłącznie maile autoryzacyjne (potwierdzenie konta, reset hasła).
 * Wszystko inne przechodzi przez tę funkcję.
 *
 * Konfiguracja (sekrety projektu, patrz supabase/functions/README.md):
 *   MAIL_FROM        — nadawca, np. "Zaprintowana <zamowienia@zaprintowana.pl>"  [wymagane]
 *   SITE_URL         — adres sklepu bez końcowego ukośnika                        [wymagane]
 *   RESEND_API_KEY   — klucz Resend; jeśli ustawiony, wysyłamy przez Resend
 *   SMTP_HOST/PORT/USER/PASSWORD — alternatywa dla Resend, zwykły SMTP
 *   MAIL_BCC         — opcjonalna kopia klienckiego maila dla obsługi sklepu
 *   OWNER_EMAIL      — adres właściciela na powiadomienia o zamówieniach/płatnościach
 *                       [opcjonalny, domyślnie zaprintowanasklep@gmail.com]
 *
 * Bez konfiguracji funkcja nie wywala błędu, tylko zwraca { sent: false, reason }.
 * Sklep działa dalej, a panel pokazuje link do formularza do wysłania ręcznie.
 *
 * Każde wywołanie wysyła mail do klienta ORAZ osobne powiadomienie do właściciela —
 * to dwie różne, tematycznie odrębne wiadomości, nie kopia (BCC) tej samej treści.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

type EmailKind = 'order-placed' | 'payment-received';

const DEFAULT_OWNER_EMAIL = 'zaprintowanasklep@gmail.com';

interface RequestBody {
  orderId?: string;
  kind?: EmailKind;
}

interface OrderItemRow {
  product_name: string;
  quantity: number;
  unit_price: number | null;
}

interface OrderRow {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string;
  shipping_city: string;
  shipping_postcode: string;
  notes: string | null;
  payment_status: string;
  shipping_method_name: string | null;
  shipping_point: string | null;
  shipping_cost: number | null;
  payment_method: string | null;
  items_subtotal: number | null;
  coupon_code: string | null;
  discount_amount: number | null;
  total_amount: number | null;
  personalisation_token: string;
  order_placed_email_sent_at: string | null;
  payment_email_sent_at: string | null;
  order_items: OrderItemRow[];
}

const SENT_AT_COLUMN: Record<EmailKind, keyof OrderRow> = {
  'order-placed': 'order_placed_email_sent_at',
  'payment-received': 'payment_email_sent_at',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPrice(value: number): string {
  const formatted = value % 1 === 0 ? value.toString() : value.toFixed(2).replace('.', ',');
  return `${formatted} zł`;
}

function orderTotal(items: OrderItemRow[]): number {
  return items.reduce((sum, item) => sum + item.quantity * (item.unit_price ?? 0), 0);
}

function layout(heading: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="pl">
  <body style="margin:0;padding:24px;background:#fbf5f2;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#2b2420;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e8d5cd;border-radius:4px;">
      <tr>
        <td style="padding:28px 32px;">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#b97e94;">Zaprintowana</p>
          <h1 style="margin:0 0 20px;font-size:22px;font-weight:600;line-height:1.25;">${escapeHtml(heading)}</h1>
          ${bodyHtml}
        </td>
      </tr>
    </table>
    <p style="max-width:560px;margin:16px auto 0;font-size:12px;color:#8a7b74;text-align:center;">
      Zaprintowana — serio fajne kartki
    </p>
  </body>
</html>`;
}

function itemsHtml(items: OrderItemRow[]): string {
  if (!items?.length) {
    return '';
  }
  const rows = items
    .map(
      (item) =>
        `<li style="margin-bottom:4px;">${item.quantity} × ${escapeHtml(item.product_name)}</li>`,
    )
    .join('');
  return `<ul style="margin:0 0 20px;padding-left:18px;font-size:14px;line-height:1.6;">${rows}</ul>`;
}

/** Ta sama lista, ale z cenami i sumą — na potrzeby powiadomienia właściciela. */
function ownerItemsHtml(items: OrderItemRow[]): string {
  if (!items?.length) {
    return '<p style="margin:0 0 16px;font-size:14px;color:#8a7b74;">Brak pozycji.</p>';
  }
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:4px 0;font-size:14px;">${item.quantity} × ${escapeHtml(item.product_name)}</td>
          <td style="padding:4px 0;font-size:14px;text-align:right;white-space:nowrap;">${formatPrice(item.quantity * (item.unit_price ?? 0))}</td>
        </tr>`,
    )
    .join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;border-top:1px solid #e8d5cd;border-bottom:1px solid #e8d5cd;">
      ${rows}
    </table>
    <p style="margin:0 0 20px;font-size:15px;font-weight:600;text-align:right;">Razem: ${formatPrice(orderTotal(items))}</p>`;
}

const PAYMENT_LABELS: Record<string, string> = {
  transfer: 'przelew z góry',
  cod: 'płatność przy odbiorze (pobranie)',
};

/**
 * Podsumowanie kwot i dostawy — te same liczby, które zapisała baza przy składaniu
 * zamówienia. Zamówienia sprzed wprowadzenia wyboru dostawy nie mają ich wcale,
 * więc wtedy blok się nie pokazuje.
 */
function summaryHtml(order: OrderRow): string {
  if (!order.total_amount) {
    return '';
  }

  const row = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:4px 0;font-size:14px;color:#8a7b74;">${escapeHtml(label)}</td>
      <td style="padding:4px 0;font-size:${strong ? '15px' : '14px'};text-align:right;white-space:nowrap;${
        strong ? 'font-weight:600;' : ''
      }">${escapeHtml(value)}</td>
    </tr>`;

  const rows = [row('Wartość produktów', formatPrice(order.items_subtotal ?? 0))];

  if ((order.discount_amount ?? 0) > 0) {
    rows.push(
      row(
        order.coupon_code ? `Kupon ${order.coupon_code}` : 'Rabat',
        `−${formatPrice(order.discount_amount ?? 0)}`,
      ),
    );
  }

  rows.push(
    row(
      `Dostawa: ${order.shipping_method_name ?? 'ustalana indywidualnie'}`,
      order.shipping_cost ? formatPrice(order.shipping_cost) : 'gratis',
    ),
  );

  if (order.shipping_point) {
    rows.push(row('Punkt odbioru', order.shipping_point));
  }
  rows.push(row('Płatność', PAYMENT_LABELS[order.payment_method ?? 'transfer'] ?? '—'));
  rows.push(row('Do zapłaty', formatPrice(order.total_amount), true));

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-top:1px solid #e8d5cd;border-bottom:1px solid #e8d5cd;">
      ${rows.join('')}
    </table>`;
}

function buildEmail(kind: EmailKind, order: OrderRow, siteUrl: string) {
  const orderNumber = order.id.slice(0, 8);
  const name = escapeHtml(order.customer_name.split(' ')[0] || order.customer_name);

  if (kind === 'order-placed') {
    return {
      subject: `Zamówienie ${orderNumber} przyjęte — Zaprintowana`,
      html: layout(
        'Mamy Wasze zamówienie',
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Cześć ${name}, dziękujemy za zamówienie <strong>${orderNumber}</strong>.</p>
         ${itemsHtml(order.order_items)}
         ${summaryHtml(order)}
         <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Odezwiemy się z potwierdzeniem płatności. Zaraz po niej dostaniecie od nas link do formularza, w którym podacie treści na zaproszenia — imiona, datę, godzinę i miejsca.</p>
         <p style="margin:0;font-size:13px;line-height:1.7;color:#8a7b74;">Numer zamówienia warto zachować — przyda się przy każdym pytaniu.</p>`,
      ),
    };
  }

  const formUrl = `${siteUrl}/order/${order.personalisation_token}`;
  return {
    subject: `Płatność zaksięgowana — uzupełnij dane do zaproszeń (${orderNumber})`,
    html: layout(
      'Płatność zaksięgowana',
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Cześć ${name}, zaksięgowaliśmy płatność za zamówienie <strong>${orderNumber}</strong>. Został ostatni krok.</p>
       <p style="margin:0 0 20px;font-size:15px;line-height:1.7;">Wypełnijcie formularz z treściami na zaproszenia — imiona, data, godzina i miejsca. Link jest prywatny, prowadzi wyłącznie do Waszego zamówienia.</p>
       <p style="margin:0 0 24px;">
         <a href="${formUrl}" style="display:inline-block;background:#b97e94;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:2px;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Uzupełnij dane</a>
       </p>
       <p style="margin:0 0 8px;font-size:13px;line-height:1.7;color:#8a7b74;">Gdyby przycisk nie działał, skopiujcie ten adres:</p>
       <p style="margin:0;font-size:13px;line-height:1.6;word-break:break-all;color:#b97e94;">${formUrl}</p>`,
    ),
  };
}

/** Powiadomienie do właściciela — inna treść niż mail do klienta, nie jego kopia. */
function buildOwnerEmail(kind: EmailKind, order: OrderRow, siteUrl: string) {
  const orderNumber = order.id.slice(0, 8);
  const adminUrl = `${siteUrl}/admin`;
  const customerName = escapeHtml(order.customer_name);
  const phoneLine = order.customer_phone
    ? `<a href="tel:${escapeHtml(order.customer_phone)}" style="color:#b97e94;">${escapeHtml(order.customer_phone)}</a>`
    : '—';
  const notesBlock = order.notes
    ? `<p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#8a7b74;"><strong>Uwagi:</strong> ${escapeHtml(order.notes)}</p>`
    : '';

  const customerBlock = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;font-size:14px;line-height:1.8;">
      <tr><td style="color:#8a7b74;padding-right:12px;vertical-align:top;">Klient</td><td>${customerName}</td></tr>
      <tr><td style="color:#8a7b74;padding-right:12px;vertical-align:top;">E-mail</td><td><a href="mailto:${escapeHtml(order.customer_email)}" style="color:#b97e94;">${escapeHtml(order.customer_email)}</a></td></tr>
      <tr><td style="color:#8a7b74;padding-right:12px;vertical-align:top;">Telefon</td><td>${phoneLine}</td></tr>
      <tr><td style="color:#8a7b74;padding-right:12px;vertical-align:top;">Dostawa</td><td>${escapeHtml(order.shipping_address)}, ${escapeHtml(order.shipping_postcode)} ${escapeHtml(order.shipping_city)}</td></tr>
    </table>`;

  const ctaButton = `
    <p style="margin:0;">
      <a href="${adminUrl}" style="display:inline-block;background:#b97e94;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:2px;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Otwórz w panelu</a>
    </p>`;

  if (kind === 'order-placed') {
    return {
      subject: `Nowe zamówienie ${orderNumber} — ${order.customer_name}`,
      html: layout(
        'Nowe zamówienie',
        `<p style="margin:0 0 20px;font-size:15px;line-height:1.7;">Wpłynęło zamówienie <strong>${orderNumber}</strong>, jeszcze nieopłacone.</p>
         ${customerBlock}
         ${ownerItemsHtml(order.order_items)}
         ${summaryHtml(order)}
         ${notesBlock}
         ${ctaButton}`,
      ),
    };
  }

  return {
    subject: `Zamówienie ${orderNumber} opłacone — ${order.customer_name}`,
    html: layout(
      'Płatność zaksięgowana',
      `<p style="margin:0 0 20px;font-size:15px;line-height:1.7;">Zamówienie <strong>${orderNumber}</strong> zostało opłacone. Klient dostał link do formularza z danymi do zaproszeń — dane pojawią się w panelu, gdy je uzupełni.</p>
       ${customerBlock}
       ${ownerItemsHtml(order.order_items)}
       ${summaryHtml(order)}
       ${notesBlock}
       ${ctaButton}`,
    ),
  };
}

async function sendViaResend(
  apiKey: string,
  payload: { from: string; to: string; bcc?: string; subject: string; html: string },
) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: payload.from,
      to: [payload.to],
      ...(payload.bcc ? { bcc: [payload.bcc] } : {}),
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend ${response.status}: ${await response.text()}`);
  }
}

async function sendViaSmtp(payload: {
  from: string;
  to: string;
  bcc?: string;
  subject: string;
  html: string;
}) {
  const { SMTPClient } = await import('jsr:@denodrivers/smtp@0.14.0');
  const client = new SMTPClient({
    connection: {
      hostname: Deno.env.get('SMTP_HOST')!,
      port: Number(Deno.env.get('SMTP_PORT') ?? 465),
      tls: (Deno.env.get('SMTP_TLS') ?? 'true') !== 'false',
      auth: {
        username: Deno.env.get('SMTP_USER')!,
        password: Deno.env.get('SMTP_PASSWORD')!,
      },
    },
  });

  try {
    await client.send({
      from: payload.from,
      to: payload.to,
      ...(payload.bcc ? { bcc: payload.bcc } : {}),
      subject: payload.subject,
      html: payload.html,
    });
  } finally {
    await client.close();
  }
}

async function send(
  resendKey: string | undefined,
  payload: { from: string; to: string; bcc?: string; subject: string; html: string },
): Promise<void> {
  if (resendKey) {
    await sendViaResend(resendKey, payload);
  } else {
    await sendViaSmtp(payload);
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { orderId, kind } = body;
  if (!orderId || (kind !== 'order-placed' && kind !== 'payment-received')) {
    return json({ error: 'orderId and kind are required' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, created_at, customer_name, customer_email, customer_phone, shipping_address, shipping_city, shipping_postcode, notes, payment_status, shipping_method_name, shipping_point, shipping_cost, payment_method, items_subtotal, coupon_code, discount_amount, total_amount, personalisation_token, order_placed_email_sent_at, payment_email_sent_at, order_items(product_name, quantity, unit_price)',
    )
    .eq('id', orderId)
    .maybeSingle();

  if (error) {
    return json({ error: error.message }, 500);
  }
  if (!data) {
    return json({ error: 'Order not found' }, 404);
  }

  const order = data as unknown as OrderRow;
  const sentAtColumn = SENT_AT_COLUMN[kind];

  // Mail wysyłamy raz — powtórne kliknięcie statusu w panelu nie zasypie klienta
  // (ani właściciela) powtórkami.
  if (order[sentAtColumn]) {
    return json({ sent: false, reason: 'already_sent' });
  }
  if (kind === 'payment-received' && order.payment_status !== 'paid') {
    return json({ sent: false, reason: 'not_paid' });
  }

  const from = Deno.env.get('MAIL_FROM');
  const siteUrl = (Deno.env.get('SITE_URL') ?? '').replace(/\/+$/, '');
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const smtpHost = Deno.env.get('SMTP_HOST');
  const ownerEmail = Deno.env.get('OWNER_EMAIL') || DEFAULT_OWNER_EMAIL;

  if (!from || !siteUrl) {
    return json({ sent: false, reason: 'missing_mail_config' });
  }
  if (!resendKey && !smtpHost) {
    return json({ sent: false, reason: 'missing_mail_provider' });
  }

  const { subject, html } = buildEmail(kind, order, siteUrl);

  try {
    await send(resendKey, {
      from,
      to: order.customer_email,
      bcc: Deno.env.get('MAIL_BCC') || undefined,
      subject,
      html,
    });
  } catch (sendError) {
    const message = sendError instanceof Error ? sendError.message : String(sendError);
    console.error(`[send-order-email] ${kind} ${orderId} (klient): ${message}`);
    return json({ sent: false, reason: 'send_failed', message }, 502);
  }

  // Powiadomienie właściciela jest wysyłane best-effort — jego ewentualna awaria
  // (np. literówka w OWNER_EMAIL) nie ma cofać maila, który klient już dostał.
  let ownerNotified = false;
  try {
    const ownerEmailContent = buildOwnerEmail(kind, order, siteUrl);
    await send(resendKey, {
      from,
      to: ownerEmail,
      subject: ownerEmailContent.subject,
      html: ownerEmailContent.html,
    });
    ownerNotified = true;
  } catch (ownerError) {
    const message = ownerError instanceof Error ? ownerError.message : String(ownerError);
    console.error(`[send-order-email] ${kind} ${orderId} (właściciel, ${ownerEmail}): ${message}`);
  }

  await supabase
    .from('orders')
    .update({ [sentAtColumn]: new Date().toISOString() })
    .eq('id', order.id);

  return json({ sent: true, ownerNotified });
});
