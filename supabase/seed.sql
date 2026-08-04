-- Seed data: Adalar
insert into public.adalar (ada, blok_sayisi, toplam_daire, toplam_kat) values
  ('ADA-1', 24, 624, 192),
  ('ADA-2', 24, 588, 192),
  ('ADA-3', 22, 546, 174),
  ('ADA-4', 22, 546, 174),
  ('ADA-5', 22, 546, 174),
  ('ADA-6', 22, 564, 175)
on conflict (ada) do nothing;
