-- ============================================================
-- SANTİYE TAKİP - EKSİK ŞEMA TAMAMLAMA (SQL EDITOR)
-- ============================================================
-- Bu dosya, supabase/migrations altındaki tüm migration'ların
-- FINAL durumunu temsil eden idempotent (tekrar çalıştırılabilir)
-- birleşimidir. Son senkron: 20260824120000_denetim_kaydi.
-- Yeni projede (szjpnaslernezvjoscag) zaten var olan
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
-- 2a. user_id FK'leri: ON DELETE SET NULL
--     (rapor/atama gecmisi olan kullanici silinebilsin; audit kolonu
--     null'a döner, kayit silinmez)
-- ============================================================
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.raporlar'::regclass
      and contype = 'f' and conname like '%user_id%'
  loop
    execute format('alter table public.raporlar drop constraint %I', r.conname);
  end loop;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.raporlar'::regclass and conname = 'raporlar_user_id_fkey'
  ) then
    alter table public.raporlar
      add constraint raporlar_user_id_fkey
      foreign key (user_id) references auth.users(id)
      on delete set null;
  end if;
end $$;

do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.kullanici_ada_atamalari'::regclass
      and contype = 'f' and conname like '%user_id%'
  loop
    execute format('alter table public.kullanici_ada_atamalari drop constraint %I', r.conname);
  end loop;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.kullanici_ada_atamalari'::regclass and conname = 'kullanici_ada_atamalari_user_id_fkey'
  ) then
    alter table public.kullanici_ada_atamalari
      add constraint kullanici_ada_atamalari_user_id_fkey
      foreign key (user_id) references auth.users(id)
      on delete set null;
  end if;
end $$;

do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.kullanici_blok_atamalari'::regclass
      and contype = 'f' and conname like '%user_id%'
  loop
    execute format('alter table public.kullanici_blok_atamalari drop constraint %I', r.conname);
  end loop;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.kullanici_blok_atamalari'::regclass and conname = 'kullanici_blok_atamalari_user_id_fkey'
  ) then
    alter table public.kullanici_blok_atamalari
      add constraint kullanici_blok_atamalari_user_id_fkey
      foreign key (user_id) references auth.users(id)
      on delete set null;
  end if;
end $$;

-- ============================================================
-- 2b. Veri araligi CHECK kisitlari (NOT VALID: mevcut veriyi dokunmaz,
--     yeni yazimlari denetler)
-- ============================================================
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.raporlar'::regclass and conname = 'raporlar_ilerleme_yuzde_aralik'
  ) then
    alter table public.raporlar
      add constraint raporlar_ilerleme_yuzde_aralik
      check (ilerleme_yuzde between 0 and 100) not valid;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.raporlar'::regclass and conname = 'raporlar_blok_no_aralik'
  ) then
    alter table public.raporlar
      add constraint raporlar_blok_no_aralik
      check (blok_no >= 0) not valid;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.is_kalemi_hedefleri'::regclass and conname = 'hedefler_blok_no_aralik'
  ) then
    alter table public.is_kalemi_hedefleri
      add constraint hedefler_blok_no_aralik
      check (blok_no >= 0) not valid;
  end if;
end $$;

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
-- yetkili_adalar jsonb_typeof ile guvenli ayristirilir (array veya string
-- JSON dizisi); bozuk metadata tum signup'i dusurmesin diye her alan
-- exception-guard'lidir.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ad_soyad text;
  v_rol text;
  v_admin boolean := false;
  v_pm boolean := false;
  v_adalar text[] := '{}'::text[];
begin
  begin
    if jsonb_typeof(new.raw_user_meta_data -> 'yetkili_adalar') = 'array' then
      select coalesce(array_agg(deger), '{}'::text[])
        into v_adalar
        from jsonb_array_elements_text(new.raw_user_meta_data -> 'yetkili_adalar') as t(deger);
    elsif jsonb_typeof(new.raw_user_meta_data -> 'yetkili_adalar') = 'string' then
      select coalesce(array_agg(deger), '{}'::text[])
        into v_adalar
        from jsonb_array_elements_text((new.raw_user_meta_data ->> 'yetkili_adalar')::jsonb) as t(deger);
    end if;
  exception when others then
    v_adalar := '{}'::text[];
  end;

  begin
    v_admin := coalesce((new.raw_user_meta_data ->> 'admin')::boolean, false);
  exception when others then
    v_admin := false;
  end;

  begin
    v_pm := coalesce((new.raw_user_meta_data ->> 'proje_muduru')::boolean, false);
  exception when others then
    v_pm := false;
  end;

  v_ad_soyad := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'ad_soyad'), ''),
    new.email,
    new.id::text
  );
  v_rol := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'rol'), ''), 'Personel');

  insert into public.kullanicilar (id, ad_soyad, rol, admin, yetkili_adalar, proje_muduru)
  values (new.id, v_ad_soyad, v_rol, v_admin, v_adalar, v_pm)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Yetki yukseltme korumasi: admin olmayan kendi rolunu degistiremez
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

-- updated_at tetikleyicisi (blok atamalari); search_path sabitlenmis
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
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

  -- Rapor sahipligi ad_soyad uzerinden kuruldugundan ayni isimli ikinci
  -- kullanici, digerinin raporlarini 'kendi adina' yazabilir. Ad soyad
  -- benzersizligi hem burada hem asagidaki unique index ile garanti edilir.
  v_user_id := gen_random_uuid();

  if exists (
    select 1 from public.kullanicilar
    where lower(btrim(ad_soyad)) = lower(btrim(p_ad_soyad))
      and id <> v_user_id
  ) then
    raise exception 'Bu ad soyad zaten kayıtlı: %', p_ad_soyad;
  end if;

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

  -- GoTrue'nun bekledigi identity kaydi; provider_id = sub = user_id::text.
  begin
    insert into auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      v_user_id, v_user_id::text, v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      'email', v_now, v_now, v_now
    );
  exception when unique_violation then
    null;
  end;

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
exception
  when unique_violation then
    raise exception 'Bu e-posta zaten kayıtlı: %', v_email;
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
    (select santiye_is_pm())
    or (
      (select santiye_is_admin())
      and (coalesce(array_length((select santiye_yetkili_adalar()), 1), 0) = 0 or ada = any((select santiye_yetkili_adalar())))
    )
    or (
      raporlayan = (select santiye_ad_soyad())
      and (
        ada = (select atanan_ada from public.kullanicilar where id = (select auth.uid()))
        or exists (
          select 1 from public.kullanici_ada_atamalari a
          where a.ad_soyad = (select santiye_ad_soyad()) and a.ada = ada
        )
      )
    )
    and (user_id is null or user_id = (select auth.uid()))
  );

drop policy if exists "Raporlar kendi adina gunceller" on public.raporlar;
drop policy if exists "Raporlar herkes gunceller" on public.raporlar;
drop policy if exists "Raporlar sahibi gunceller" on public.raporlar;
drop policy if exists "Raporlar kendi adina gunceller (atandiysa)" on public.raporlar;
create policy "Raporlar kendi adina gunceller (atandiysa)" on public.raporlar
  for update using (
    (select santiye_is_pm())
    or (
      (select santiye_is_admin())
      and (coalesce(array_length((select santiye_yetkili_adalar()), 1), 0) = 0 or ada = any((select santiye_yetkili_adalar())))
    )
    or (
      raporlayan = (select santiye_ad_soyad())
      and (
        ada = (select atanan_ada from public.kullanicilar where id = (select auth.uid()))
        or exists (
          select 1 from public.kullanici_ada_atamalari a
          where a.ad_soyad = (select santiye_ad_soyad()) and a.ada = ada
        )
      )
    )
  )
  with check (
    (select santiye_is_pm())
    or (
      (select santiye_is_admin())
      and (coalesce(array_length((select santiye_yetkili_adalar()), 1), 0) = 0 or ada = any((select santiye_yetkili_adalar())))
    )
    or (
      raporlayan = (select santiye_ad_soyad())
      and (
        ada = (select atanan_ada from public.kullanicilar where id = (select auth.uid()))
        or exists (
          select 1 from public.kullanici_ada_atamalari a
          where a.ad_soyad = (select santiye_ad_soyad()) and a.ada = ada
        )
      )
    )
  );

drop policy if exists "Raporlar kendi adina siler" on public.raporlar;
drop policy if exists "Raporlar herkes siler" on public.raporlar;
drop policy if exists "Raporlar admin siler" on public.raporlar;
drop policy if exists "Raporlar sef ve PM siler" on public.raporlar;
create policy "Raporlar sef ve PM siler" on public.raporlar
  for delete using (
    (select santiye_is_pm())
    or (
      (select santiye_is_admin())
      and (coalesce(array_length((select santiye_yetkili_adalar()), 1), 0) = 0 or ada = any((select santiye_yetkili_adalar())))
    )
  );

-- Ada atamalari
drop policy if exists "Ada atamalari herkes gorur" on public.kullanici_ada_atamalari;
create policy "Ada atamalari herkes gorur" on public.kullanici_ada_atamalari
  for select using (true);

drop policy if exists "Ada atamalari herkes ekler" on public.kullanici_ada_atamalari;
drop policy if exists "Ada atamalari admin/PM ekler" on public.kullanici_ada_atamalari;
create policy "Ada atamalari admin/PM ekler" on public.kullanici_ada_atamalari
  for insert with check (
    (select santiye_is_pm())
    or (
      (select santiye_is_admin())
      and (coalesce(array_length((select santiye_yetkili_adalar()), 1), 0) = 0 or ada = any((select santiye_yetkili_adalar())))
    )
  );

drop policy if exists "Ada atamalari herkes gunceller" on public.kullanici_ada_atamalari;
drop policy if exists "Ada atamalari admin/PM gunceller" on public.kullanici_ada_atamalari;
create policy "Ada atamalari admin/PM gunceller" on public.kullanici_ada_atamalari
  for update using (
    (select santiye_is_pm())
    or (
      (select santiye_is_admin())
      and (coalesce(array_length((select santiye_yetkili_adalar()), 1), 0) = 0 or ada = any((select santiye_yetkili_adalar())))
    )
  )
  with check (
    (select santiye_is_pm())
    or (
      (select santiye_is_admin())
      and (coalesce(array_length((select santiye_yetkili_adalar()), 1), 0) = 0 or ada = any((select santiye_yetkili_adalar())))
    )
  );

drop policy if exists "Ada atamalari herkes siler" on public.kullanici_ada_atamalari;
drop policy if exists "Ada atamalari admin/PM siler" on public.kullanici_ada_atamalari;
create policy "Ada atamalari admin/PM siler" on public.kullanici_ada_atamalari
  for delete using (
    (select santiye_is_pm())
    or (
      (select santiye_is_admin())
      and (coalesce(array_length((select santiye_yetkili_adalar()), 1), 0) = 0 or ada = any((select santiye_yetkili_adalar())))
    )
  );

-- Blok atamalari
drop policy if exists "Blok atamalari herkes gorur" on public.kullanici_blok_atamalari;
create policy "Blok atamalari herkes gorur" on public.kullanici_blok_atamalari
  for select using (true);

drop policy if exists "Blok atamalari herkes ekler" on public.kullanici_blok_atamalari;
drop policy if exists "Blok atamalari admin/PM ekler" on public.kullanici_blok_atamalari;
create policy "Blok atamalari admin/PM ekler" on public.kullanici_blok_atamalari
  for insert with check (
    (select santiye_is_pm())
    or (
      (select santiye_is_admin())
      and (coalesce(array_length((select santiye_yetkili_adalar()), 1), 0) = 0 or ada = any((select santiye_yetkili_adalar())))
    )
  );

drop policy if exists "Blok atamalari herkes gunceller" on public.kullanici_blok_atamalari;
drop policy if exists "Blok atamalari admin/PM gunceller" on public.kullanici_blok_atamalari;
create policy "Blok atamalari admin/PM gunceller" on public.kullanici_blok_atamalari
  for update using (
    (select santiye_is_pm())
    or (
      (select santiye_is_admin())
      and (coalesce(array_length((select santiye_yetkili_adalar()), 1), 0) = 0 or ada = any((select santiye_yetkili_adalar())))
    )
  )
  with check (
    (select santiye_is_pm())
    or (
      (select santiye_is_admin())
      and (coalesce(array_length((select santiye_yetkili_adalar()), 1), 0) = 0 or ada = any((select santiye_yetkili_adalar())))
    )
  );

drop policy if exists "Blok atamalari herkes siler" on public.kullanici_blok_atamalari;
drop policy if exists "Blok atamalari admin/PM siler" on public.kullanici_blok_atamalari;
create policy "Blok atamalari admin/PM siler" on public.kullanici_blok_atamalari
  for delete using (
    (select santiye_is_pm())
    or (
      (select santiye_is_admin())
      and (coalesce(array_length((select santiye_yetkili_adalar()), 1), 0) = 0 or ada = any((select santiye_yetkili_adalar())))
    )
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

-- Kalinti public bucket kayitlari da silinir
do $$ begin
  delete from storage.objects where bucket = 'rapor_fotograflar';
  delete from storage.buckets where id = 'rapor_fotograflar';
exception when others then
  null;
end $$;

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

-- Rapor sahipligi ad_soyad esitligine dayandigindan ayni isimli iki
-- kullanici birbirinin kimligine burunebilir; benzersizlik indeksi
-- (veri temizse kurulur, degilse uyari loglanir).
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'kullanicilar_ad_soyad_benzersiz'
  ) then
    if exists (
      select 1 from public.kullanicilar
      group by lower(btrim(ad_soyad))
      having count(*) > 1
    ) then
      raise warning 'kullanicilar tablosunda yinelenen ad_soyad var; benzersizlik indeksi kurulmadi. Once kayitlari ayristirin.';
    else
      create unique index kullanicilar_ad_soyad_benzersiz
        on public.kullanicilar (lower(btrim(ad_soyad)));
    end if;
  end if;
end $$;

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
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke usage on schema public from anon;

-- Sonradan olusturulacak nesnelerde anon'a otomatik yetki verilmesin
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

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
-- 11. DENETIM KAYDI (AUDIT TRAIL)
--     Yazma: hicbir rol dogrudan yazamaz (RLS varsayilan reddeder);
--     kayitlari yalnizca asagidaki SECURITY DEFINER tetikleyici uretir.
--     Okuma: yalnizca santiye sefi (admin) ve proje muduru.
-- ============================================================
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  tablo_adi text not null,
  kayit_id text not null,
  islem text not null check (islem in ('INSERT', 'UPDATE', 'DELETE')),
  eski_deger jsonb,
  yeni_deger jsonb,
  islem_yapan uuid references auth.users(id) on delete set null,
  islem_yapan_ad text,
  islem_zamani timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create index if not exists idx_audit_log_zaman
  on public.audit_log (islem_zamani desc);
create index if not exists idx_audit_log_tablo_kayit
  on public.audit_log (tablo_adi, kayit_id);

-- DELETE tetikleyicisinde NEW tanimsiz oldugundan referanslar tg_op ile
-- dallandirilir.
create or replace function public.santiye_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_yapan uuid := auth.uid();
  v_ad text;
begin
  if v_yapan is not null then
    begin
      select ad_soyad into v_ad from public.kullanicilar where id = v_yapan;
    exception when others then
      v_ad := null;
    end;
  end if;

  insert into public.audit_log (
    tablo_adi, kayit_id, islem, eski_deger, yeni_deger, islem_yapan, islem_yapan_ad
  ) values (
    tg_table_name,
    case
      when tg_op = 'INSERT' then to_jsonb(new) ->> 'id'
      else to_jsonb(old) ->> 'id'
    end,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    v_yapan,
    v_ad
  );

  return coalesce(new, old);
end;
$$;

revoke execute on function public.santiye_audit() from public;
revoke execute on function public.santiye_audit() from anon;

drop trigger if exists raporlar_audit on public.raporlar;
create trigger raporlar_audit
after insert or update or delete on public.raporlar
for each row execute procedure public.santiye_audit();

drop trigger if exists hedefler_audit on public.is_kalemi_hedefleri;
create trigger hedefler_audit
after insert or update or delete on public.is_kalemi_hedefleri
for each row execute procedure public.santiye_audit();

drop trigger if exists kullanicilar_audit on public.kullanicilar;
create trigger kullanicilar_audit
after insert or update or delete on public.kullanicilar
for each row execute procedure public.santiye_audit();

drop policy if exists "Denetim kaydi sef ve PM gorur" on public.audit_log;
create policy "Denetim kaydi sef ve PM gorur" on public.audit_log
  for select using (
    (select santiye_is_admin()) or (select santiye_is_pm())
  );

-- ============================================================
-- Rapor tarihi kisiti: gelecek tarihli kayit engellenir.
-- (migrations/20260825120000_rapor_tarih_kisiti.sql ile ayni)
-- CHECK CURRENT_DATE ile kullanilamadigindan tetik kullanilir;
-- Europe/Istanbul takvimi client'in yerel todayISO()'su ile uyumludur.
-- ============================================================
create or replace function public.rapor_tarih_dogrula()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.tarih > (now() at time zone 'Europe/Istanbul')::date then
    raise exception 'Rapor tarihi gelecek bir gun olamaz: %', new.tarih
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists raporlar_tarih_kisiti on public.raporlar;
create trigger raporlar_tarih_kisiti
  before insert or update of tarih on public.raporlar
  for each row execute function public.rapor_tarih_dogrula();

-- ============================================================
-- BITTI. Hata yoksa sekma tamdir.
-- ============================================================
