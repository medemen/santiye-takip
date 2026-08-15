-- Faz 4 migrasyonlari dosya adi siralamasinda 0013_rol_hiyerarsi_duzenlemesi'nden
-- SONRA uygulandigindan, faz4'un yeniden olusturdugu gevsek politikalar efektif RLS'i
-- bozuyordu (0013'un siki modeli OR semantigi ile etkisiz kaliyordu):
--
--   1) raporlar INSERT/UPDATE: faz4'un ada-kontrollu olmayan "kendi adina ekler/
--      gunceller"i 0013'un ada-scope'lu "(atandiysa)" politikalarini etkisiz birakiyordu
--      -> saha personeli atanmadigi adaya rapor girebiliyordu.
--   2) raporlar DELETE: faz4'un "kendi adina siler"i 0013'un "yalnizca sef/PM siler"i
--      ile OR ediliyordu -> saha personeli kendi raporunu silme izni kazaniyordu.
--   3) kullanicilar UPDATE: faz4'un "kendini veya admin gunceller"i 0013'un
--      "yalnizca PM gunceller"i ile OR ediliyordu -> self-update acigi geri geldi.
--      Ayrica kullanicilar_yetki_korumasi trigger'i ad_soyad/atanan_ada'yi
--      korumadigindan kullanici kendi ad_soyad'ini degistirip santiye_ad_soyad()
--      uzerinden rapor sahipligini taklit edebiliyordu.
--
-- Bu migrasyon 0013 modelini tek kaynak yapar (uzakta 0013 uygulanmamis olsa bile
-- siki politikalar acikca yeniden kurulur) ve trigger'i kimlik/atanma korumasiyla
-- gunceller. PM'ler ust rol oldugundan kendi kayitlarini duzenleyebilir.

-- 1) Rapor INSERT: ada-scope'lu kural tek kaynak.
drop policy if exists "Raporlar kendi adina ekler" on public.raporlar;
drop policy if exists "Raporlar kendi adina ekler (atandiysa)" on public.raporlar;
create policy "Raporlar kendi adina ekler (atandiysa)" on public.raporlar
  for insert with check (
    santiye_is_pm()
    or santiye_is_admin()
    or (
      raporlayan = santiye_ad_soyad()
      and (
        ada = (select atanan_ada from public.kullanicilar where id = auth.uid())
        or exists (
          select 1 from public.kullanici_ada_atamalari a
          where a.ad_soyad = santiye_ad_soyad() and a.ada = ada
        )
      )
    )
  );

-- 2) Rapor UPDATE: ada-scope'lu kural tek kaynak.
drop policy if exists "Raporlar kendi adina gunceller" on public.raporlar;
drop policy if exists "Raporlar kendi adina gunceller (atandiysa)" on public.raporlar;
create policy "Raporlar kendi adina gunceller (atandiysa)" on public.raporlar
  for update using (
    santiye_is_pm()
    or santiye_is_admin()
    or (
      raporlayan = santiye_ad_soyad()
      and (
        ada = (select atanan_ada from public.kullanicilar where id = auth.uid())
        or exists (
          select 1 from public.kullanici_ada_atamalari a
          where a.ad_soyad = santiye_ad_soyad() and a.ada = ada
        )
      )
    )
  )
  with check (
    santiye_is_pm()
    or santiye_is_admin()
    or (
      raporlayan = santiye_ad_soyad()
      and (
        ada = (select atanan_ada from public.kullanicilar where id = auth.uid())
        or exists (
          select 1 from public.kullanici_ada_atamalari a
          where a.ad_soyad = santiye_ad_soyad() and a.ada = ada
        )
      )
    )
  );

-- 3) Rapor DELETE: yalnizca sef/PM (client silmeyi admin'e kilitler).
drop policy if exists "Raporlar kendi adina siler" on public.raporlar;
drop policy if exists "Raporlar sef ve PM siler" on public.raporlar;
create policy "Raporlar sef ve PM siler" on public.raporlar
  for delete using (santiye_is_admin() or santiye_is_pm());

-- 4) Kullanicilar UPDATE: yalnizca PM (0013 modeli; self-update kapali).
drop policy if exists "Kullanicilar kendini veya admin gunceller" on public.kullanicilar;
drop policy if exists "Kullanicilar yalnizca PM gunceller" on public.kullanicilar;
create policy "Kullanicilar yalnizca PM gunceller" on public.kullanicilar
  for update using ((select santiye_is_pm()))
  with check ((select santiye_is_pm()));

-- 5) Yetki koruma trigger: kimlik (ad_soyad) ve atanma (atanan_ada) alanlari da
--    korunur; admin veya PM kendi kaydini duzenleyebilir (defans-icin-derinlik).
create or replace function public.kullanicilar_yetki_korumasi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = new.id and not santiye_is_admin() and not santiye_is_pm() then
    if new.ad_soyad is distinct from old.ad_soyad
       or new.atanan_ada is distinct from old.atanan_ada
       or new.admin is distinct from old.admin
       or new.rol is distinct from old.rol
       or new.yetkili_adalar is distinct from old.yetkili_adalar
       or new.proje_muduru is distinct from old.proje_muduru then
      raise exception 'Yetki ve kimlik alanlarini degistirme izniniz yok';
    end if;
  end if;
  return new;
end
$$;
