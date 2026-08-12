-- Guvenlik ve kalinti temizligi:
--  1) anon rolune verilen tablo/sekans SELECT yetkileri geri alinir (sifir ayricalik).
--     RLS using(true) politikalarindaki tablolar (raporlar, kullanicilar) anon SELECT
--     ile herkese acilirdi; revoke bu acigi kapatir (20260731073747'yi etkisizlestirir).
--  2) Kaldirilan fotograf ozelliginden kalan tablo ve storage politikaları temizlenir.

revoke usage on schema public from anon;
revoke select on all tables in schema public from anon;
revoke select on all sequences in schema public from anon;

drop table if exists public.rapor_fotograflar;

drop policy if exists "Rapor fotolari yukleme" on storage.objects;
drop policy if exists "Rapor fotolari herkes okur" on storage.objects;
drop policy if exists "Rapor fotolari sahibi/admin/PM siler" on storage.objects;
