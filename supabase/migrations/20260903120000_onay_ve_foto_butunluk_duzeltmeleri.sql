-- Onay akisi ve fotograf butunlugu duzeltmeleri.
-- Bu migrasyon su sorunlari giderir:
--
--   1) Sahip kendi raporunu onaylayabiliyordu: UPDATE politikasinda sutun
--      ayrimi yoktu; sahip dali (user_id = auth.uid()) satirin tum
--      sutunlarini (onay_durumu dahil) guncellemeye izin veriyordu.
--      BEFORE UPDATE trigger'i onay/revizyon degisimini sef/PM ile sinirlar.
--      Yeniden gonderim serbesttir: satiri guncelleyebilen herkes durumu
--      'beklemede'ye cekip revizyon notunu temizleyebilir (RLS satir
--      erisimini zaten denetler).
--   2) Storage 'Fotograf silme' politikasi her authenticated kullaniciya
--      her fotografi silme izni veriyordu. Silme; yukleyen (owner) veya
--      sef/PM ile sinirlandi.
--   3) 'rapor-fotolari' bucket'inda sunucu tarafi boyut/tur siniri yoktu;
--      5MB limit ve resim MIME allowlist'i eklendi (client kontrolu
--      atlatilabilir oldugundan).
--   4) 20260825140000'deki user_id backfill'i hataliydi: GROUP BY
--      ad_soyad, id her satirda dogru dondugunden cift isimli
--      kullanicilarin raporlari deterministik olmayan sekilde birine
--      baglandi. Cift isimle eslesen raporlarin user_id'si NULL'a
--      geri alinir (guvenli taraf: yalnizca admin/PM duzenler).
--   5) 20260825 INSERT politikasi, 20260823'teki global user_id frenini
--      (user_id IS NULL OR user_id = auth.uid()) dusurmustu. PM/admin
--      dali diledigi user_id'yi yazabiliyordu (audit izi bozulur).
--      Fren ayni politikaya geri eklendi.

-- ============================================================
-- 1) Onay/revizyon sutun korumasi
-- ============================================================
create or replace function public.rapor_onay_korumasi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.onay_durumu is distinct from old.onay_durumu
     or coalesce(new.revizyon_notu, '') <> coalesce(old.revizyon_notu, '') then
    if not (public.santiye_is_pm() or public.santiye_is_admin()) then
      -- Yeniden gonderim atomik sekli disinda her degisim yasaktir
      if not (
        new.onay_durumu = 'beklemede'
        and coalesce(new.revizyon_notu, '') = ''
      ) then
        raise exception 'Onay durumu yalnizca santiye sefi veya proje muduru tarafindan degistirilebilir';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists rapor_onay_korumasi on public.raporlar;
create trigger rapor_onay_korumasi
before update of onay_durumu, revizyon_notu on public.raporlar
for each row execute procedure public.rapor_onay_korumasi();

revoke execute on function public.rapor_onay_korumasi() from public;

-- ============================================================
-- 2) Fotograf silme: yukleyen veya sef/PM
-- ============================================================
drop policy if exists "Fotograf silme" on storage.objects;
create policy "Fotograf silme" on storage.objects
  for delete using (
    bucket_id = 'rapor-fotolari'
    and (
      owner = (select auth.uid())
      or (select public.santiye_is_pm())
      or (select public.santiye_is_admin())
    )
  );

-- ============================================================
-- 3) Bucket sunucu tarafi sinirlari (boyut + MIME)
-- ============================================================
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'buckets'
      and column_name = 'file_size_limit'
  ) then
    update storage.buckets
    set file_size_limit = 5242880,
        allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    where id = 'rapor-fotolari';
  else
    raise warning 'storage.buckets.file_size_limit kolonu yok; bucket sinirlari uygulanmadi.';
  end if;
end $$;

-- ============================================================
-- 4) Cift isimli backfill duzeltmesi: belirsiz eslesmeler NULL'a
-- ============================================================
update public.raporlar r
set user_id = null
where r.user_id is not null
  and (select count(*) from public.kullanicilar k where k.ad_soyad = r.raporlayan) > 1;

-- ============================================================
-- 5) INSERT politikasina user_id sahtecilik freni
-- ============================================================
do $$
begin
  drop policy if exists "Raporlar kendi adina ekler (atandiysa)" on public.raporlar;
  create policy "Raporlar kendi adina ekler (atandiysa)" on public.raporlar
    for insert with check (
      (
        (select santiye_is_pm())
        or (
          (select santiye_is_admin())
          and (coalesce(array_length((select santiye_yetkili_adalar()), 1), 0) = 0 or ada = any((select santiye_yetkili_adalar())))
        )
        or (
          user_id = (select auth.uid())
          and (
            ada = (select atanan_ada from public.kullanicilar where id = (select auth.uid()))
            or exists (
              select 1 from public.kullanici_ada_atamalari a
              where a.ad_soyad = (select santiye_ad_soyad()) and a.ada = ada
            )
          )
        )
      )
      and (user_id is null or user_id = (select auth.uid()))
    );
end
$$;
