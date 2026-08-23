-- Guvenlik ve veri butunlugu duzeltmeleri.
-- Bu migrasyon su sorunlari giderir:
--
--   1) handle_new_user regresyonu: 20260801110935 raw_user_meta_data icindeki
--      JSON dizisini dogrudan ::text[] cast etmeye calisiyordu; bu cast
--      '["ADA-1"]' gibi degerlerde exception firlatir ve TUM auth signup'i
--      dusurur. jsonb-guvenli ayristirma geri getirildi.
--   2) user_id FK'lerinde ON DELETE davranisi yoktu: rapor/atama gecmisi olan
--      bir kullanici silinmek istendiginde FK ihlaliyle silme basarisiz olurdu.
--      ON DELETE SET NULL eklendi (raporlar user_id'si audit amaclidir;
--      kayit silinmemelidir).
--   3) CHECK kisitlari yoktu: ilerleme_yuzde 0-100 araligi ve blok_no >= 0.
--      Mevcut veriyi bozmamak icin NOT VALID eklenir (yeni yazimlar denetlenir).
--   4) Rapor politikalarindaki admin dali ada-scope'suzdu; atama politikalarinda
--      admin yetkili_adalar ile sinirliydi (tutarsizlik). Admin dali artik
--      yetkili_adalar ile scope'lanir; bos dizi = sinirsiz (eski davranis korunur,
--      yapilandirilmamis adminler kilitleynmesin diye). PM sinirsizdir.
--   5) set_updated_at fonksiyonunda search_path sabitlenmedi + PUBLIC execute
--       hakki kapandi.
--   6) santiye_kullanici_olustur'un dogrudan auth.users'a insert ettigi
--      kullanicilar icin auth.identities satiri olusturulmuyordu; GoTrue
--      bekledigi identity kaydi tamamlandi.
--   7) 0010'da acilan public 'rapor_fotograflar' storage bucket kalintisi
--      temizlendi (tablo/policy'ler 20260810110000'de silinmisti).
--   8) supabase_realtime publication uyeligi idempotent guard ile garantiye
--      alindi (fresh replay'de 'already member' hatasini engeller).
--   9) Atama politikalarina da raporlarla ayni admin semantigi uygulandi
--      (bos yetkili_adalar = sinirsiz) ve butun yeniden kurulan
--      politikalarda helper cagrilari initplan'a sarildi.
--  10) raporlar INSERT'inde user_id sahteciligi engellendi.
--  11) kullanicilar.ad_soyad benzersizlik indeksi (veri temizse kurulur).
--  12) Varsayilan anon ayricaliklari kalici olarak kapandi.

-- ============================================================
-- 1) handle_new_user: jsonb-guvenli yetkili_adalar ayristirma
-- ============================================================
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

-- Trigger'in kendisi dogru fonksiyona isaret ediyor; garantilemek icin yeniden kur
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

revoke execute on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to service_role;

-- ============================================================
-- 2) user_id FK'leri: ON DELETE SET NULL
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
-- 3) Veri araligi CHECK kisitlari (NOT VALID: mevcut veriyi dokunmaz,
--    yeni yazimlari denetler)
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
-- 4) Rapor politikalarinda admin dalina ada-scope'u
--    (bos yetkili_adalar = sinirsiz; PM daima sinirsiz)
--    + helper cagrilarinin (select ...) ile initplan'a sarilmasi
--    (satir basina yeniden degerlendirme maliyetini kaldirir)
--    + INSERT'te user_id sahteciligi engeli:
--      user_id ya bos ya da oturum sahibi olmalidir; aksi halde saha
--      personeli baskasinin user_id'siyle rapor acip audit izini bozabilir.
-- ============================================================
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

drop policy if exists "Raporlar sef ve PM siler" on public.raporlar;
create policy "Raporlar sef ve PM siler" on public.raporlar
  for delete using (
    (select santiye_is_pm())
    or (
      (select santiye_is_admin())
      and (coalesce(array_length((select santiye_yetkili_adalar()), 1), 0) = 0 or ada = any((select santiye_yetkili_adalar())))
    )
  );

-- ============================================================
-- 4b) Atama politikalarinda ayni admin semantigi (bos dizi = sinirsiz).
--     Eski haliyle yetkili_adalar'i bos olan bir admin hicbir adada
--     atama yonetemezken rapor yazabiliyordu; iki modul artik tutarli.
--     PM sinirsizdir. Initplan sarmasi burada da uygulanir.
-- ============================================================
drop policy if exists "Ada atamalari admin/PM ekler" on public.kullanici_ada_atamalari;
create policy "Ada atamalari admin/PM ekler" on public.kullanici_ada_atamalari
  for insert with check (
    (select santiye_is_pm())
    or (
      (select santiye_is_admin())
      and (coalesce(array_length((select santiye_yetkili_adalar()), 1), 0) = 0 or ada = any((select santiye_yetkili_adalar())))
    )
  );

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

drop policy if exists "Ada atamalari admin/PM siler" on public.kullanici_ada_atamalari;
create policy "Ada atamalari admin/PM siler" on public.kullanici_ada_atamalari
  for delete using (
    (select santiye_is_pm())
    or (
      (select santiye_is_admin())
      and (coalesce(array_length((select santiye_yetkili_adalar()), 1), 0) = 0 or ada = any((select santiye_yetkili_adalar())))
    )
  );

drop policy if exists "Blok atamalari admin/PM ekler" on public.kullanici_blok_atamalari;
create policy "Blok atamalari admin/PM ekler" on public.kullanici_blok_atamalari
  for insert with check (
    (select santiye_is_pm())
    or (
      (select santiye_is_admin())
      and (coalesce(array_length((select santiye_yetkili_adalar()), 1), 0) = 0 or ada = any((select santiye_yetkili_adalar())))
    )
  );

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

drop policy if exists "Blok atamalari admin/PM siler" on public.kullanici_blok_atamalari;
create policy "Blok atamalari admin/PM siler" on public.kullanici_blok_atamalari
  for delete using (
    (select santiye_is_pm())
    or (
      (select santiye_is_admin())
      and (coalesce(array_length((select santiye_yetkili_adalar()), 1), 0) = 0 or ada = any((select santiye_yetkili_adalar())))
    )
  );

-- ============================================================
-- 5) set_updated_at: search_path sabitleme + PUBLIC execute kaldirma
-- ============================================================
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

revoke execute on function public.set_updated_at() from public;

-- ============================================================
-- 6) santiye_kullanici_olustur: auth.identities satiri da olustur
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
  if exists (
    select 1 from public.kullanicilar
    where lower(btrim(ad_soyad)) = lower(btrim(p_ad_soyad))
      and id <> v_user_id
  ) then
    raise exception 'Bu ad soyad zaten kayıtlı: %', p_ad_soyad;
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

  -- GoTrue'nun bekledigi identity kaydi. Konvansiyon 0003_seed_baslangic
  -- deseniyle aynidir: provider_id = sub = user_id::text; kolon adi
  -- 'provider' dir ('provider_name' diye bir kolon yoktur).
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

-- ============================================================
-- 7) Kalinti public storage bucket temizligi
-- ============================================================
do $$ begin
  delete from storage.objects where bucket = 'rapor_fotograflar';
  delete from storage.buckets where id = 'rapor_fotograflar';
exception when others then
  null;
end $$;

-- ============================================================
-- 8) Realtime publication uyeligi (idempotent)
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'raporlar'
  ) then
    alter publication supabase_realtime add table public.raporlar;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'kullanicilar'
  ) then
    alter publication supabase_realtime add table public.kullanicilar;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'kullanici_ada_atamalari'
  ) then
    alter publication supabase_realtime add table public.kullanici_ada_atamalari;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'kullanici_blok_atamalari'
  ) then
    alter publication supabase_realtime add table public.kullanici_blok_atamalari;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'santiye_config'
  ) then
    alter publication supabase_realtime add table public.santiye_config;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'is_kalemi_hedefleri'
  ) then
    alter publication supabase_realtime add table public.is_kalemi_hedefleri;
  end if;
end $$;

-- ============================================================
-- 8b) kullanicilar.ad_soyad benzersizligi (buyuk/kucuk harf ve bosluk
--     duyarsiz). Rapor sahipligi ad_soyad esitligine dayandigindan ayni
--     isimli iki kullanici birbirinin kimligine burunebilir.
--     Mevcut veride yinelenen isim varsa indeks kurulmaz (veri bozulmaz,
--     uyari loglanir); yeni yazimlar sonraki denemede denetlenir.
-- ============================================================
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
-- 8c) Varsayilan ayricaliklar: bu schema'da SONRADAN olusturulacak
--     tablo/sequence'ler anon'a otomatik yetki verilmasin
--     (0001'de verilen, 20260810110000'de geri alinan yetkinin
--     yeni nesnelerde tekrar olusmasını kalici olarak engeller).
-- ============================================================
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- ============================================================
-- 9) Anon ayricaliklarinin sifira cekilmesi (defansif tekrar)
-- ============================================================
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke usage on schema public from anon;
