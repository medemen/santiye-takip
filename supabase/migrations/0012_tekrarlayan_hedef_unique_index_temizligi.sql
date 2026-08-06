-- 0008, eski schema'daki unique constraint'e (is_kalemi_hedefleri_ada_blok_no_is_kalemi_key)
-- ek olarak ayni kolonlarda ozdes bir index (uq_is_kalemi_hedefleri_ada_blok_kalem) olusturmustu.
-- Cifte index gereksizdir; fazlalik olani kaldir.
drop index if exists public.uq_is_kalemi_hedefleri_ada_blok_kalem;
