alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders
  drop column if exists shipping_method_code,
  drop column if exists shipping_method_name,
  drop column if exists shipping_cost,
  drop column if exists shipping_point,
  drop column if exists payment_method;

drop table if exists public.shipping_methods;
