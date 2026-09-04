alter table public.orders
  drop column if exists items_subtotal,
  drop column if exists coupon_code,
  drop column if exists discount_amount,
  drop column if exists total_amount;

drop function if exists public.check_coupon(text, numeric);
drop function if exists public.coupon_discount(text, numeric, numeric);
drop table if exists public.discount_coupons;
