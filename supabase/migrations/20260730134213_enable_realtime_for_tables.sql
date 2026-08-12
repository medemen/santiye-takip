-- Realtime yayini (remote'da 20260730134213_enable_realtime_for_tables ile eslestirildi)
-- 0001_v2_initial_schema bu tablolari publication'a ekler; bu migrasyon
-- idempotent calisir (fresh push'ta 0001 tekrari no-op'tur).
do $$
declare
  t text;
begin
  foreach t in array array['raporlar','kullanici_ada_atamalari','kullanici_blok_atamalari']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
