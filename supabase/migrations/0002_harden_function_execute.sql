-- Yardimci fonksiyon erisimini daralt
-- anon hicbir yardimci fonksiyonu RPC ile cagiramaz
revoke execute on function public.santiye_ad_soyad() from anon;
revoke execute on function public.santiye_is_admin() from anon;
revoke execute on function public.santiye_is_pm() from anon;
revoke execute on function public.santiye_yetkili_adalar() from anon;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.kullanicilar_yetki_korumasi() from anon;

-- Trigger fonksiyonlari RPC ile cagrilamaz (sadece trigger/service_role)
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.kullanicilar_yetki_korumasi() from authenticated;

grant execute on function public.handle_new_user() to service_role;
grant execute on function public.kullanicilar_yetki_korumasi() to service_role;
