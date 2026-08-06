-- Kullanici yonetimi: yeni kullanici olusturma, sifre sifirlama, silme.
-- App tarafi dogrudan auth.users yazamaz; bu SECURITY DEFINER fonksiyonlar
-- yalnizca admin kullanicilarin yapabilecegi yonetim islemlerini yapar.
-- Not: kullanicilar UPDATE'i hala RLS ile admin'e kapalidir (0007).

-- Slug uretici (authStore.epostaOlustur ile esdeger)
create or replace function public.santiye_slug(p_metin text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(
    regexp_replace(
      lower(translate(p_metin, 'çğıöşüÇĞİÖŞÜâîû', 'cgiosuCGIOSUaiu')),
      '[^a-z0-9.]+', '.', 'g'
    ),
    '^\.+|\.+$', '', 'g'
  )
$$;

-- Yeni kullanici: auth.users + kullanicilar satiri olusturur (yalnizca admin).
-- raw_user_meta_data'ya yetkili_adalar dizisi YAZILMAZ (handle_new_user
-- trigger'i dizi cast'inde patlamasin diye); yetkiler kullanicilar satirina
-- acikca yazilir.
create or replace function public.santiye_kullanici_olustur(
  p_ad_soyad text,
  p_rol text,
  p_sifre text,
  p_admin boolean default false,
  p_proje_muduru boolean default false,
  p_yetkili_adalar text[] default '{}',
  p_atanan_ada text default null
)
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_email text;
  v_domain text;
  v_now timestamptz := now();
begin
  if not public.santiye_is_admin() then
    raise exception 'Yetkiniz yok';
  end if;

  if p_ad_soyad is null or btrim(p_ad_soyad) = '' then
    raise exception 'Ad soyad boş olamaz';
  end if;
  if p_sifre is null or length(p_sifre) < 6 then
    raise exception 'Şifre en az 6 karakter olmalı';
  end if;

  select coalesce(config->'marka'->>'emailDomain', 'santiye.com')
  into v_domain
  from public.santiye_config
  where id = 1;

  v_email := public.santiye_slug(p_ad_soyad) || '@' || v_domain;

  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'Bu e-posta zaten kayıtlı: %', v_email;
  end if;

  v_user_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at, phone, phone_confirmed_at,
    phone_change, phone_change_token, phone_change_sent_at, confirmed_at,
    email_change_token_current, email_change_confirm_status, banned_until,
    reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    v_email, crypt(p_sifre, gen_salt('bf')), v_now, v_now,
    '', v_now, '', v_now, '', '', v_now,
    null, jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('ad_soyad', p_ad_soyad, 'rol', p_rol, 'admin', p_admin, 'proje_muduru', p_proje_muduru),
    null, v_now, v_now, null, v_now,
    '', '', v_now, v_now, '', 0, null,
    '', v_now, false, null
  );

  insert into public.kullanicilar (id, ad_soyad, rol, admin, yetkili_adalar, atanan_ada, proje_muduru)
  values (v_user_id, p_ad_soyad, p_rol, p_admin, p_yetkili_adalar, p_atanan_ada, p_proje_muduru)
  on conflict (id) do update set
    ad_soyad = excluded.ad_soyad,
    rol = excluded.rol,
    admin = excluded.admin,
    yetkili_adalar = excluded.yetkili_adalar,
    atanan_ada = excluded.atanan_ada,
    proje_muduru = excluded.proje_muduru;

  return json_build_object('id', v_user_id, 'email', v_email);
end;
$$;

-- Sifre sifirlama (yalnizca admin)
create or replace function public.santiye_kullanici_sifre_sifirla(p_user_id uuid, p_yeni_sifre text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.santiye_is_admin() then
    raise exception 'Yetkiniz yok';
  end if;
  if p_yeni_sifre is null or length(p_yeni_sifre) < 6 then
    raise exception 'Şifre en az 6 karakter olmalı';
  end if;
  update auth.users
  set encrypted_password = crypt(p_yeni_sifre, gen_salt('bf')),
      updated_at = now()
  where id = p_user_id;
  if not found then
    raise exception 'Kullanıcı bulunamadı';
  end if;
end;
$$;

-- Kullanici silme (yalnizca admin; kendi hesabini silemez)
create or replace function public.santiye_kullanici_sil(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.santiye_is_admin() then
    raise exception 'Yetkiniz yok';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Kendi hesabınızı silemezsiniz';
  end if;
  delete from public.kullanicilar where id = p_user_id;
  delete from auth.users where id = p_user_id;
end;
$$;

-- anon/public sifir erisim; yalnizca authenticated
revoke execute on function public.santiye_slug(text) from public;
revoke execute on function public.santiye_kullanici_olustur(text, text, text, boolean, boolean, text[], text) from public;
revoke execute on function public.santiye_kullanici_sifre_sifirla(uuid, text) from public;
revoke execute on function public.santiye_kullanici_sil(uuid) from public;

grant execute on function public.santiye_slug(text) to authenticated;
grant execute on function public.santiye_kullanici_olustur(text, text, text, boolean, boolean, text[], text) to authenticated;
grant execute on function public.santiye_kullanici_sifre_sifirla(uuid, text) to authenticated;
grant execute on function public.santiye_kullanici_sil(uuid) to authenticated;
