drop function if exists public.save_order_details(uuid, jsonb);
drop function if exists public.get_order_details_form(uuid);
drop index if exists public.orders_personalisation_token_idx;
alter table public.orders
  drop column if exists personalisation_token,
  drop column if exists personalisation_submitted_at,
  drop column if exists order_placed_email_sent_at,
  drop column if exists payment_email_sent_at;
