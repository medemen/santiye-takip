-- ============================================================
-- DUZELTME: pgcrypto (crypt/gen_salt) 'extensions' semasinda
-- Supabase Dashboard -> SQL Editor -> yapistir -> Run
-- ============================================================

-- santiye_kullanici_olustur
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
set search_path = public, extensions, auth
as $$
declare
  v_user_id uuid;
  v_email text;
  v_domain text;
  v_now timestamptz := now();
begin
  if not public.santiye_is_pm() then
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
    phone_change, phone_change_token, phone_change_sent_at,
    email_change_token_current, email_change_confirm_status, banned_until,
    reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    v_email, extensions.crypt(p_sifre, extensions.gen_salt('bf')), v_now, v_now,
    '', v_now, '', v_now, '', '', v_now,
    null, jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('ad_soyad', p_ad_soyad, 'rol', p_rol, 'admin', p_admin, 'proje_muduru', p_proje_muduru),
    null, v_now, v_now, null, v_now,
    '', '', v_now, '', 0, null,
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

-- santiye_kullanici_sifre_sifirla
create or replace function public.santiye_kullanici_sifre_sifirla(p_user_id uuid, p_yeni_sifre text)
returns void
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
begin
  if not public.santiye_is_pm() then
    raise exception 'Yetkiniz yok';
  end if;
  if p_yeni_sifre is null or length(p_yeni_sifre) < 6 then
    raise exception 'Şifre en az 6 karakter olmalı';
  end if;
  update auth.users
  set encrypted_password = extensions.crypt(p_yeni_sifre, extensions.gen_salt('bf')),
      updated_at = now()
  where id = p_user_id;
  if not found then
    raise exception 'Kullanıcı bulunamadı';
  end if;
end;
$$;

-- santiye_kullanici_sil
create or replace function public.santiye_kullanici_sil(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
begin
  if not public.santiye_is_pm() then
    raise exception 'Yetkiniz yok';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Kendi hesabınızı silemezsiniz';
  end if;
  delete from public.kullanicilar where id = p_user_id;
  delete from auth.users where id = p_user_id;
end;
$$;
