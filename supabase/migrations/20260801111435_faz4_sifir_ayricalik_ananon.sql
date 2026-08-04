-- Faz 4: anon/PUBLIC sifir ayricalik (remote'da 20260801111435_faz4_sifir_ayricalik_ananon ile eslestirildi)
revoke execute on function public.santiye_ad_soyad() from public;
revoke execute on function public.santiye_is_admin() from public;
revoke execute on function public.santiye_is_pm() from public;
revoke execute on function public.santiye_yetkili_adalar() from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.kullanicilar_yetki_korumasi() from public;

grant execute on function public.santiye_ad_soyad() to authenticated;
grant execute on function public.santiye_is_admin() to authenticated;
grant execute on function public.santiye_is_pm() to authenticated;
grant execute on function public.santiye_yetkili_adalar() to authenticated;
grant execute on function public.kullanicilar_yetki_korumasi() to authenticated;
grant execute on function public.handle_new_user() to service_role;
