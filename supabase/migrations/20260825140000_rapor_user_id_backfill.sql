-- Rapor sahipligi: raporlayan (isim) tabanli kontrollerden user_id (UUID)
-- tabanli kontrollere gecis. Isim tabanli kontrol ayni isimli iki kullanici
-- arasinda taklit riski tasir; UUID benzersiz ve dogrulanabilir.

-- 1) Mevcut raporlarda user_id bos olanlari kullanicilar tablosundan esle
--    (sadece tek eslesme varsa -- cakismali isimleri dokunma).
UPDATE public.raporlar r
SET user_id = k.id
FROM (
  SELECT id, ad_soyad
  FROM public.kullanicilar
  GROUP BY ad_soyad, id
  HAVING count(*) = 1
) k
WHERE r.user_id IS NULL
  AND r.raporlayan = k.ad_soyad;

-- 2-3) Politika guncellemleri: search_path sabitlenmis PL/pgSQL bloguyla
--      uygulanir;=(select ...)` sarmalindaki text[] cikis tipi dogru cozulur.
DO $$
BEGIN
  -- INSERT politikasi
  DROP POLICY IF EXISTS "Raporlar kendi adina ekler (atandiysa)" ON public.raporlar;
  CREATE POLICY "Raporlar kendi adina ekler (atandiysa)" ON public.raporlar
    FOR INSERT WITH CHECK (
      (SELECT santiye_is_pm())
      OR (
        (SELECT santiye_is_admin())
        AND (coalesce(array_length((SELECT santiye_yetkili_adalar()), 1), 0) = 0 OR ada = ANY(santiye_yetkili_adalar()))
      )
      OR (
        user_id = (SELECT auth.uid())
        AND (
          ada = (SELECT atanan_ada FROM public.kullanicilar WHERE id = (SELECT auth.uid()))
          OR EXISTS (
            SELECT 1 FROM public.kullanici_ada_atamalari a
            WHERE a.ad_soyad = (SELECT santiye_ad_soyad()) AND a.ada = ada
          )
        )
      )
    );

  -- UPDATE politikasi
  DROP POLICY IF EXISTS "Raporlar kendi adina gunceller (atandiysa)" ON public.raporlar;
  CREATE POLICY "Raporlar kendi adina gunceller (atandiysa)" ON public.raporlar
    FOR UPDATE USING (
      (SELECT santiye_is_pm())
      OR (
        (SELECT santiye_is_admin())
        AND (coalesce(array_length((SELECT santiye_yetkili_adalar()), 1), 0) = 0 OR ada = ANY(santiye_yetkili_adalar()))
      )
      OR (
        user_id = (SELECT auth.uid())
        AND (
          ada = (SELECT atanan_ada FROM public.kullanicilar WHERE id = (SELECT auth.uid()))
          OR EXISTS (
            SELECT 1 FROM public.kullanici_ada_atamalari a
            WHERE a.ad_soyad = (SELECT santiye_ad_soyad()) AND a.ada = ada
          )
        )
      )
    )
    WITH CHECK (
      (SELECT santiye_is_pm())
      OR (
        (SELECT santiye_is_admin())
        AND (coalesce(array_length((SELECT santiye_yetkili_adalar()), 1), 0) = 0 OR ada = ANY(santiye_yetkili_adalar()))
      )
      OR (
        user_id = (SELECT auth.uid())
        AND (
          ada = (SELECT atanan_ada FROM public.kullanicilar WHERE id = (SELECT auth.uid()))
          OR EXISTS (
            SELECT 1 FROM public.kullanici_ada_atamalari a
            WHERE a.ad_soyad = (SELECT santiye_ad_soyad()) AND a.ada = ada
          )
        )
      )
    );
END
$$;
