-- Bir is kalemi/blok icin tek hedef tarih.
create unique index if not exists uq_is_kalemi_hedefleri_ada_blok_kalem
  on public.is_kalemi_hedefleri(ada, blok_no, is_kalemi);
