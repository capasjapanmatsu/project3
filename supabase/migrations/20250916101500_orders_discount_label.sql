-- Add optional discount_label column to show label like "ポイント利用"
alter table public.orders add column if not exists discount_label text;

