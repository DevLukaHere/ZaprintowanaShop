-- P7: formularz kontaktowy na stronie /kontakt.
-- Wiadomości trafiają do tabeli i są widoczne w panelu — bez zewnętrznego dostawcy poczty.
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  handled boolean not null default false
);

alter table public.contact_messages enable row level security;

-- Wysłać może każdy, ale tylko rozsądnej długości i zawsze jako nieobsłużoną.
drop policy if exists "Anyone can send a contact message" on public.contact_messages;
create policy "Anyone can send a contact message"
  on public.contact_messages for insert
  to anon, authenticated
  with check (
    length(trim(name)) between 1 and 120
    and length(trim(email)) between 3 and 160
    and length(trim(message)) between 1 and 4000
    and length(coalesce(phone, '')) <= 40
    and length(coalesce(subject, '')) <= 160
    and handled = false
  );

drop policy if exists "Admins read contact messages" on public.contact_messages;
create policy "Admins read contact messages"
  on public.contact_messages for select
  to authenticated
  using (is_admin());

drop policy if exists "Admins update contact messages" on public.contact_messages;
create policy "Admins update contact messages"
  on public.contact_messages for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);
