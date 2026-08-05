-- Guvenlik acigi: self-update dalinda bir kullanici kendi satirina
-- admin=true / proje_muduru=true yazabiliyordu (yetki yukseltme).
-- App kullanicilar uzerinde hicbir UPDATE yapmiyor (yalnizca okuma),
-- bu yuzden UPDATE yalnizca admin'lerin kullanimina acilir.
drop policy if exists "Kullanicilar kendini veya admin gunceller" on public.kullanicilar;
create policy "Kullanicilar yalnizca admin gunceller" on public.kullanicilar
  for update using ((select santiye_is_admin()))
  with check ((select santiye_is_admin()));
