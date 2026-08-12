-- is_kalemi_hedefleri tablosu realtime publication'a eklenir.
-- Boylesi hedef kanali (src/stores/hedefStore.ts) gercek olaylar alir.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'is_kalemi_hedefleri'
  ) then
    alter publication supabase_realtime add table public.is_kalemi_hedefleri;
  end if;
end $$;
