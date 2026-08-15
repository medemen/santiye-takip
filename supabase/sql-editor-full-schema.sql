-- ============================================================
-- SANTİYE TAKİP - EKSİK ŞEMA TAMAMLAMA (SQL EDITOR)
-- ============================================================
-- Bu dosya, supabase/migrations altındaki tüm migration'ların
-- FINAL durumunu temsil eden idempotent (tekrar çalıştırılabilir)
-- birleşimidir. Yeni projede (szjpnaslernezvjoscag) zaten var olan
-- tablolara/veriye DOKUNMAZ; yalnızca eksik parçaları kurar.
--
-- KULLANIM: Supabase Dashboard -> SQL Editor -> yapıştır -> Run.
-- Tekrar çalıştırılması güvenlidir.
-- ============================================================

-- ============================================================
-- 1. TABLOLAR (zaten varsa atlar; veri korunur)
-- ============================================================
create table if not exists public.kullanicilar (
  id uuid references auth.users on delete cascade primary key,
  ad_soyad text not null,
  rol text not null default 'Personel',
  admin boolean not null default false,
  yetkili_adalar text[] default '{}',
  atanan_ada text,
  proje_muduru boolean not null default false,
  created_at timestamptz default now()
);
alter table public.kullanicilar enable row level security;

create table if not exists public.santiye_config (
  id integer primary key default 1,
  config jsonb not null,
  version integer not null default 2,
  updated_at timestamptz default now()
);
alter table public.santiye_config enable row level security;

create table if not exists public.raporlar (
  id text primary key,
  tarih date not null,
  raporlayan text not null,
  ada text not null,
  blok_no int not null,
  is_kalemi text not null,
  durum text not null check (durum in ('planlandi','devam_ediyor','tamamlandi','gecikme')),
  ilerleme_yuzde int not null default 0,
  aciklama text default '',
  user_id uuid references auth.users(id),
  olusturma_tarihi timestamptz default now(),
  created_at timestamptz default now()
);
alter table public.raporlar enable row level security;

create table if not exists public.kullanici_ada_atamalari (
  ad_soyad text primary key,
  ada text,
  user_id uuid references auth.users(id),
  updated_at timestamptz default now()
);
alter table public.kullanici_ada_atamalari enable row level security;

create table if not exists public.kullanici_blok_atamalari (
  id serial primary key,
  ad_soyad text not null,
  ada text not null,
  blok_nos int[] not null default '{}',
  user_id uuid references auth.users(id),
  updated_at timestamptz default now(),
  unique(ad_soyad, ada)
);
alter table public.kullanici_blok_atamalari enable row level security;

create table if not exists public.is_kalemi_hedefleri (
  id serial primary key,
  ada text not null,
  blok_no int not null,
  is_kalemi text not null,
  hedef_tarih date,
  unique(ada, blok_no, is_kalemi)
);
alter table public.is_kalemi_hedefleri enable row level security;

-- Kaldirilan fotograf ozelligi kalintilari temizligi
alter table public.raporlar drop column if exists fotograflar;
drop table if exists public.rapor_fotograflar;

-- ============================================================
-- 2. EKSIK KOLONLAR (Faz 4)
-- ============================================================
alter table public.kullanicilar add column if not exists proje_muduru boolean not null default false;
alter table public.raporlar add column if not exists user_id uuid references auth.users(id);
alter table public.kullanici_ada_atamalari add column if not exists user_id uuid references auth.users(id);
alter table public.kullanici_blok_atamalari add column if not exists user_id uuid references auth.users(id);

-- ============================================================
-- 3. YARDIMCI FONKSIYONLAR (SECURITY DEFINER)
-- ============================================================
create or replace function public.santiye_ad_soyad()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select ad_soyad from public.kullanicilar where id = auth.uid()
$$;

create or replace function public.santiye_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select admin from public.kullanicilar where id = auth.uid()), false)
$$;

create or replace function public.santiye_is_pm()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (rol = 'Proje Müdürü' or proje_muduru) from public.kullanicilar where id = auth.uid()), false)
$$;

create or replace function public.santiye_yetkili_adalar()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select yetkili_adalar from public.kullanicilar where id = auth.uid()), '{}'::text[])
$$;

-- Yeni kullanici trigger'i (auth.users -> kullanicilar)
-- yetkili_adalar JSON dizisi text[]'e dogru cevrilir (->> cast hataliydi, duzeltildi).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_adalar text[] := coalesce(
    (select array(select jsonb_array_elements_text(new.raw_user_meta_data -> 'yetkili_adalar'))),
    '{}'::text[]
  );
begin
  insert into public.kullanicilar (id, ad_soyad, rol, admin, yetkili_adalar, proje_muduru)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'ad_soyad', new.email),
    coalesce(new.raw_user_meta_data ->> 'rol', 'Personel'),
    coalesce((new.raw_user_meta_data ->> 'admin')::boolean, false),
    v_adalar,
    coalesce((new.raw_user_meta_data ->> 'proje_muduru')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end
$$;

-- Yetki yukseltme korumasi: admin olmayan kendi rolunu degistiremez
create or replace function public.kullanicilar_yetki_korumasi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = new.id and not santiye_is_admin() then
    if new.admin is distinct from old.admin
       or new.rol is distinct from old.rol
       or new.yetkili_adalar is distinct from old.yetkili_adalar
       or new.proje_muduru is distinct from old.proje_muduru then
      raise exception 'Yetki alanlarini degistirme izniniz yok';
    end if;
  end if;
  return new;
end
$$;

-- updated_at tetikleyicisi (blok atamalari)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

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

-- ============================================================
-- 4. KULLANICI YONETIMI (yalnizca PM; SECURITY DEFINER)
-- ============================================================
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

-- ============================================================
-- 5. TETIKLEYICILER
-- ============================================================
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists kullanicilar_yetki_korumasi on public.kullanicilar;
create trigger kullanicilar_yetki_korumasi
before update on public.kullanicilar
for each row execute procedure public.kullanicilar_yetki_korumasi();

drop trigger if exists kullanici_blok_atamalari_set_updated_at on public.kullanici_blok_atamalari;
create trigger kullanici_blok_atamalari_set_updated_at
before update on public.kullanici_blok_atamalari
for each row execute procedure public.set_updated_at();

-- ============================================================
-- 6. RLS POLITIKALARI (drop + create; final durum)
-- ============================================================
-- Kullanicilar
drop policy if exists "Kullanicilar herkes gorur" on public.kullanicilar;
create policy "Kullanicilar herkes gorur" on public.kullanicilar
  for select using (true);

drop policy if exists "Kullanicilar kendini veya admin gunceller" on public.kullanicilar;
drop policy if exists "Kullanicilar kendini gunceller" on public.kullanicilar;
drop policy if exists "Kullanicilar yalnizca admin gunceller" on public.kullanicilar;
drop policy if exists "Kullanicilar yalnizca PM gunceller" on public.kullanicilar;
create policy "Kullanicilar yalnizca PM gunceller" on public.kullanicilar
  for update using ((select santiye_is_pm()))
  with check ((select santiye_is_pm()));

-- Santiye config
drop policy if exists "Config herkes gorur" on public.santiye_config;
create policy "Config herkes gorur" on public.santiye_config
  for select using (true);

drop policy if exists "Config admin/PM yazar" on public.santiye_config;
create policy "Config admin/PM yazar" on public.santiye_config
  for insert with check (santiye_is_admin() or santiye_is_pm());

drop policy if exists "Config admin/PM gunceller" on public.santiye_config;
create policy "Config admin/PM gunceller" on public.santiye_config
  for update using (santiye_is_admin() or santiye_is_pm())
  with check (santiye_is_admin() or santiye_is_pm());

drop policy if exists "Config admin/PM siler" on public.santiye_config;
create policy "Config admin/PM siler" on public.santiye_config
  for delete using (santiye_is_admin() or santiye_is_pm());

-- Raporlar
drop policy if exists "Raporlar herkes gorur" on public.raporlar;
create policy "Raporlar herkes gorur" on public.raporlar
  for select using (true);

drop policy if exists "Raporlar kendi adina ekler" on public.raporlar;
drop policy if exists "Raporlar herkes ekler" on public.raporlar;
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

drop policy if exists "Raporlar kendi adina gunceller" on public.raporlar;
drop policy if exists "Raporlar herkes gunceller" on public.raporlar;
drop policy if exists "Raporlar sahibi gunceller" on public.raporlar;
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

drop policy if exists "Raporlar kendi adina siler" on public.raporlar;
drop policy if exists "Raporlar herkes siler" on public.raporlar;
drop policy if exists "Raporlar admin siler" on public.raporlar;
drop policy if exists "Raporlar sef ve PM siler" on public.raporlar;
create policy "Raporlar sef ve PM siler" on public.raporlar
  for delete using (santiye_is_admin() or santiye_is_pm());

-- Ada atamalari
drop policy if exists "Ada atamalari herkes gorur" on public.kullanici_ada_atamalari;
create policy "Ada atamalari herkes gorur" on public.kullanici_ada_atamalari
  for select using (true);

drop policy if exists "Ada atamalari herkes ekler" on public.kullanici_ada_atamalari;
drop policy if exists "Ada atamalari admin/PM ekler" on public.kullanici_ada_atamalari;
create policy "Ada atamalari admin/PM ekler" on public.kullanici_ada_atamalari
  for insert with check (
    santiye_is_pm() or (santiye_is_admin() and ada = any(santiye_yetkili_adalar()))
  );

drop policy if exists "Ada atamalari herkes gunceller" on public.kullanici_ada_atamalari;
drop policy if exists "Ada atamalari admin/PM gunceller" on public.kullanici_ada_atamalari;
create policy "Ada atamalari admin/PM gunceller" on public.kullanici_ada_atamalari
  for update using (
    santiye_is_pm() or (santiye_is_admin() and ada = any(santiye_yetkili_adalar()))
  )
  with check (
    santiye_is_pm() or (santiye_is_admin() and ada = any(santiye_yetkili_adalar()))
  );

drop policy if exists "Ada atamalari herkes siler" on public.kullanici_ada_atamalari;
drop policy if exists "Ada atamalari admin/PM siler" on public.kullanici_ada_atamalari;
create policy "Ada atamalari admin/PM siler" on public.kullanici_ada_atamalari
  for delete using (
    santiye_is_pm() or (santiye_is_admin() and ada = any(santiye_yetkili_adalar()))
  );

-- Blok atamalari
drop policy if exists "Blok atamalari herkes gorur" on public.kullanici_blok_atamalari;
create policy "Blok atamalari herkes gorur" on public.kullanici_blok_atamalari
  for select using (true);

drop policy if exists "Blok atamalari herkes ekler" on public.kullanici_blok_atamalari;
drop policy if exists "Blok atamalari admin/PM ekler" on public.kullanici_blok_atamalari;
create policy "Blok atamalari admin/PM ekler" on public.kullanici_blok_atamalari
  for insert with check (
    santiye_is_pm() or (santiye_is_admin() and ada = any(santiye_yetkili_adalar()))
  );

drop policy if exists "Blok atamalari herkes gunceller" on public.kullanici_blok_atamalari;
drop policy if exists "Blok atamalari admin/PM gunceller" on public.kullanici_blok_atamalari;
create policy "Blok atamalari admin/PM gunceller" on public.kullanici_blok_atamalari
  for update using (
    santiye_is_pm() or (santiye_is_admin() and ada = any(santiye_yetkili_adalar()))
  )
  with check (
    santiye_is_pm() or (santiye_is_admin() and ada = any(santiye_yetkili_adalar()))
  );

drop policy if exists "Blok atamalari herkes siler" on public.kullanici_blok_atamalari;
drop policy if exists "Blok atamalari admin/PM siler" on public.kullanici_blok_atamalari;
create policy "Blok atamalari admin/PM siler" on public.kullanici_blok_atamalari
  for delete using (
    santiye_is_pm() or (santiye_is_admin() and ada = any(santiye_yetkili_adalar()))
  );

-- Hedef tarihleri
drop policy if exists "Hedefler herkes gorur" on public.is_kalemi_hedefleri;
create policy "Hedefler herkes gorur" on public.is_kalemi_hedefleri
  for select using (true);

drop policy if exists "Hedefler admin/PM yazar" on public.is_kalemi_hedefleri;
create policy "Hedefler admin/PM yazar" on public.is_kalemi_hedefleri
  for insert with check (santiye_is_admin() or santiye_is_pm());

drop policy if exists "Hedefler admin/PM gunceller" on public.is_kalemi_hedefleri;
create policy "Hedefler admin/PM gunceller" on public.is_kalemi_hedefleri
  for update using (santiye_is_admin() or santiye_is_pm())
  with check (santiye_is_admin() or santiye_is_pm());

drop policy if exists "Hedefler admin/PM siler" on public.is_kalemi_hedefleri;
create policy "Hedefler admin/PM siler" on public.is_kalemi_hedefleri
  for delete using (santiye_is_admin() or santiye_is_pm());

-- Storage (rapor fotograflari kaldirildi; kalinti policy'ler temizlenir)
drop policy if exists "Rapor fotolari yukleme" on storage.objects;
drop policy if exists "Rapor fotolari herkes okur" on storage.objects;
drop policy if exists "Rapor fotolari sahibi/admin/PM siler" on storage.objects;

-- ============================================================
-- 7. INDEXLER
-- ============================================================
create index if not exists idx_kullanici_ada_atamalari_user_id
  on public.kullanici_ada_atamalari(user_id);
create index if not exists idx_kullanici_blok_atamalari_user_id
  on public.kullanici_blok_atamalari(user_id);
create index if not exists idx_raporlar_user_id on public.raporlar(user_id);
create index if not exists idx_raporlar_ada on public.raporlar(ada);
create index if not exists idx_raporlar_raporlayan on public.raporlar(raporlayan);
create index if not exists idx_raporlar_durum on public.raporlar(durum);
create index if not exists idx_raporlar_ada_is_kalemi on public.raporlar(ada, is_kalemi);
create index if not exists idx_raporlar_ada_blok_kalem on public.raporlar(ada, blok_no, is_kalemi);
create index if not exists idx_raporlar_olusturma_tarihi on public.raporlar(olusturma_tarihi);
create index if not exists idx_kullanicilar_ada on public.kullanicilar(atanan_ada);
drop index if exists public.uq_is_kalemi_hedefleri_ada_blok_kalem;

-- ============================================================
-- 8. REALTIME (idempotent)
-- ============================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'raporlar','kullanicilar','kullanici_ada_atamalari',
    'kullanici_blok_atamalari','santiye_config','is_kalemi_hedefleri'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ============================================================
-- 9. YETKILER: anon/PUBLIC sifir ayricalik; authenticated erisir
-- ============================================================
-- Fonksiyonlar (PUBLIC tamamen kapatilir)
revoke execute on function public.santiye_ad_soyad() from public;
revoke execute on function public.santiye_is_admin() from public;
revoke execute on function public.santiye_is_pm() from public;
revoke execute on function public.santiye_yetkili_adalar() from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.kullanicilar_yetki_korumasi() from public;
revoke execute on function public.santiye_slug(text) from public;
revoke execute on function public.santiye_kullanici_olustur(text, text, text, boolean, boolean, text[], text) from public;
revoke execute on function public.santiye_kullanici_sifre_sifirla(uuid, text) from public;
revoke execute on function public.santiye_kullanici_sil(uuid) from public;
revoke execute on function public.set_updated_at() from public;

-- anon hicbir yardimci fonksiyonu RPC ile cagiramaz
revoke execute on function public.santiye_ad_soyad() from anon;
revoke execute on function public.santiye_is_admin() from anon;
revoke execute on function public.santiye_is_pm() from anon;
revoke execute on function public.santiye_yetkili_adalar() from anon;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.kullanicilar_yetki_korumasi() from anon;
revoke execute on function public.santiye_slug(text) from anon;
revoke execute on function public.santiye_kullanici_olustur(text, text, text, boolean, boolean, text[], text) from anon;
revoke execute on function public.santiye_kullanici_sifre_sifirla(uuid, text) from anon;
revoke execute on function public.santiye_kullanici_sil(uuid) from anon;

-- authenticated
grant execute on function public.santiye_ad_soyad() to authenticated;
grant execute on function public.santiye_is_admin() to authenticated;
grant execute on function public.santiye_is_pm() to authenticated;
grant execute on function public.santiye_yetkili_adalar() to authenticated;
grant execute on function public.santiye_slug(text) to authenticated;
grant execute on function public.santiye_kullanici_olustur(text, text, text, boolean, boolean, text[], text) to authenticated;
grant execute on function public.santiye_kullanici_sifre_sifirla(uuid, text) to authenticated;
grant execute on function public.santiye_kullanici_sil(uuid) to authenticated;

-- trigger fonksiyonlari RPC ile cagrilamaz (sadece trigger/service_role)
grant execute on function public.handle_new_user() to service_role;
grant execute on function public.kullanicilar_yetki_korumasi() to service_role;

-- anon tablo/sekans erisimi tamamen kapali (offline-first sync yalnizca girisli)
revoke usage on schema public from anon;
revoke select on all tables in schema public from anon;
revoke select on all sequences in schema public from anon;

-- ============================================================
-- 10. VERI DUZELTMELERI
-- ============================================================
-- GoTrue NULL string kolon temizligi (login tarama hatasini onler)
update auth.users
set email_change = coalesce(email_change, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, '')
where email_change is null
   or email_change_token_new is null
   or confirmation_token is null
   or recovery_token is null;

-- Rol adlari yeni saha personeli setine esitlenir
update public.kullanicilar
set rol = case
  when rol = 'Saha Mühendisi' then 'İnşaat Mühendisi'
  when rol = 'Saha Mimarı' then 'Mimar'
  when rol = 'Saha Teknikeri' then 'Tekniker'
  else rol
end
where rol in ('Saha Mühendisi', 'Saha Mimarı', 'Saha Teknikeri');

-- Santiye config baslangic satiri (tam icerik bundle config'ten gelir)
insert into public.santiye_config (id, config, version, updated_at)
values (1, '{}'::jsonb, 2, now())
on conflict (id) do update set version = excluded.version, updated_at = now();

-- ============================================================
-- BITTI. Hata yoksa sekma tamdir.
-- ============================================================
