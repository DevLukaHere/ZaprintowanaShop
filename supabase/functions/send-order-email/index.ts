/**
 * Wysyłka maili transakcyjnych do klienta.
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
 *   MAIL_BCC         — opcjonalna kopia dla obsługi sklepu
 *
 * Bez konfiguracji funkcja nie wywala błędu, tylko zwraca { sent: false, reason }.
 * Sklep działa dalej, a panel pokazuje link do formularza do wysłania ręcznie.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

type EmailKind = 'order-placed' | 'payment-received';

interface RequestBody {
  orderId?: string;
  kind?: EmailKind;
}

interface OrderRow {
  id: string;
  customer_name: string;
  customer_email: string;
  payment_status: string;
  personalisation_token: string;
  order_placed_email_sent_at: string | null;
  payment_email_sent_at: string | null;
  order_items: { product_name: string; quantity: number }[];
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

function itemsHtml(items: OrderRow['order_items']): string {
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
      'id, customer_name, customer_email, payment_status, personalisation_token, order_placed_email_sent_at, payment_email_sent_at, order_items(product_name, quantity)',
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

  // Mail wysyłamy raz — powtórne kliknięcie statusu w panelu nie zasypie klienta.
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

  if (!from || !siteUrl) {
    return json({ sent: false, reason: 'missing_mail_config' });
  }
  if (!resendKey && !smtpHost) {
    return json({ sent: false, reason: 'missing_mail_provider' });
  }

  const { subject, html } = buildEmail(kind, order, siteUrl);
  const payload = {
    from,
    to: order.customer_email,
    bcc: Deno.env.get('MAIL_BCC') || undefined,
    subject,
    html,
  };

  try {
    if (resendKey) {
      await sendViaResend(resendKey, payload);
    } else {
      await sendViaSmtp(payload);
    }
  } catch (sendError) {
    const message = sendError instanceof Error ? sendError.message : String(sendError);
    console.error(`[send-order-email] ${kind} ${orderId}: ${message}`);
    return json({ sent: false, reason: 'send_failed', message }, 502);
  }

  await supabase
    .from('orders')
    .update({ [sentAtColumn]: new Date().toISOString() })
    .eq('id', order.id);

  return json({ sent: true });
});
