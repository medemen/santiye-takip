-- anon rolunden kullanici yonetim fonksiyonlari erisimini kapat (0009'un revoke'u anon'a yansimamisti).
revoke execute on function public.santiye_slug(text) from anon;
revoke execute on function public.santiye_kullanici_olustur(text, text, text, boolean, boolean, text[], text) from anon;
revoke execute on function public.santiye_kullanici_sifre_sifirla(uuid, text) from anon;
revoke execute on function public.santiye_kullanici_sil(uuid) from anon;
