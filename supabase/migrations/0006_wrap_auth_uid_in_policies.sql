-- auth_rls_initplan: auth.uid() de satir bazli re-evaluasyon yapiyor.
-- (select auth.uid()) ile statement bazli calistir.
drop policy if exists "Kullanicilar kendini veya admin gunceller" on public.kullanicilar;
create policy "Kullanicilar kendini veya admin gunceller" on public.kullanicilar
  for update using ((select auth.uid()) = id or (select santiye_is_admin()))
  with check ((select auth.uid()) = id or (select santiye_is_admin()));
