-- Rapor fotograflar alani kaldirildi (remote'da 20260801103938_drop_rapor_fotograflar ile eslestirildi)
alter table public.raporlar drop column if exists fotograflar;
