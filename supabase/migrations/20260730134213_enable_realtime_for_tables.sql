-- Realtime yayini (remote'da 20260730134213_enable_realtime_for_tables ile eslestirildi)
alter publication supabase_realtime add table public.raporlar;
alter publication supabase_realtime add table public.kullanici_ada_atamalari;
alter publication supabase_realtime add table public.kullanici_blok_atamalari;
