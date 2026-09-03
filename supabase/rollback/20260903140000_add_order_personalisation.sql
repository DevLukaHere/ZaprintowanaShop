-- Powrót do sygnatury create_order bez p_personalisation.
drop function if exists public.create_order(text, text, text, text, text, text, text, jsonb, jsonb);
alter table public.orders drop column if exists personalisation;
