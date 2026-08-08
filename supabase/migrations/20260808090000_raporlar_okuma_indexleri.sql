-- Rapor okuma performansi icin indexler.
-- Günlük ilerleme lookup'i (ada, blok_no, is_kalemi) üçlüsüyle yapiliyor.
create index if not exists idx_raporlar_ada_blok_kalem
  on public.raporlar(ada, blok_no, is_kalemi);

-- Rapor listesinde olusturma_tarihi desc siralama icin.
create index if not exists idx_raporlar_olusturma_tarihi
  on public.raporlar(olusturma_tarihi);
