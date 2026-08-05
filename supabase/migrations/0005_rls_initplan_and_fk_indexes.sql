-- RLS initplan iyilestirmesi: santiye_is_admin() satir bazli degil,
-- (select ...) ile statement bazli calissin (auth_rls_initplan WARN'i).
drop policy if exists "Kullanicilar kendini veya admin gunceller" on public.kullanicilar;
create policy "Kullanicilar kendini veya admin gunceller" on public.kullanicilar
  for update using (auth.uid() = id or (select santiye_is_admin()))
  with check (auth.uid() = id or (select santiye_is_admin()));

-- Unindexed FK INFO'lari
create index if not exists idx_kullanici_ada_atamalari_user_id
  on public.kullanici_ada_atamalari(user_id);
create index if not exists idx_kullanici_blok_atamalari_user_id
  on public.kullanici_blok_atamalari(user_id);
