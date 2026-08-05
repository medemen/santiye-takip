-- Santiye Takip V2 - Ilk schema
-- Not: adalar/bloklar tablolari kaldirildi; yapi bilgisi artik
-- `santiye_config` tablosu + bundle icindeki santiye.config.json'dan gelir.

-- Kullanicilar (auth.users ile senkron)
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

-- Santiye yapilandirma (admin panelden yonetilir; bos ise bundle config kullanilir)
create table if not exists public.santiye_config (
  id integer primary key default 1,
  config jsonb not null,
  version integer not null default 2,
  updated_at timestamptz default now()
);
alter table public.santiye_config enable row level security;

-- Raporlar
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

-- Kullanici Ada Atamalari
create table if not exists public.kullanici_ada_atamalari (
  ad_soyad text primary key,
  ada text,
  user_id uuid references auth.users(id),
  updated_at timestamptz default now()
);
alter table public.kullanici_ada_atamalari enable row level security;

-- Kullanici Blok Atamalari
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

-- Is Kalemleri Hedef Tarihleri
create table if not exists public.is_kalemi_hedefleri (
  id serial primary key,
  ada text not null,
  blok_no int not null,
  is_kalemi text not null,
  hedef_tarih date,
  unique(ada, blok_no, is_kalemi)
);
alter table public.is_kalemi_hedefleri enable row level security;

-- ============================================================
-- Yardimci fonksiyonlar (SECURITY DEFINER)
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
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.kullanicilar (id, ad_soyad, rol, admin, yetkili_adalar, proje_muduru)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'ad_soyad', new.email),
    coalesce(new.raw_user_meta_data ->> 'rol', 'Personel'),
    coalesce((new.raw_user_meta_data ->> 'admin')::boolean, false),
    coalesce((new.raw_user_meta_data ->> 'yetkili_adalar')::text[], '{}'::text[]),
    coalesce((new.raw_user_meta_data ->> 'proje_muduru')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

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

drop trigger if exists kullanicilar_yetki_korumasi on public.kullanicilar;
create trigger kullanicilar_yetki_korumasi
before update on public.kullanicilar
for each row execute procedure public.kullanicilar_yetki_korumasi();

-- anon/PUBLIC sifir ayricalik; authenticated gorebilir
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

-- Anon sync erisimi (offline-first okuyucular)
grant usage on schema public to anon;
grant select on all tables in schema public to anon;
grant select on all sequences in schema public to anon;

-- ============================================================
-- RLS Politikalar (rol bazli)
-- ============================================================
-- Kullanicilar
create policy "Kullanicilar herkes gorur" on public.kullanicilar
  for select using (true);

create policy "Kullanicilar kendini veya admin gunceller" on public.kullanicilar
  for update using (auth.uid() = id or santiye_is_admin())
  with check (auth.uid() = id or santiye_is_admin());

-- Santiye config
create policy "Config herkes gorur" on public.santiye_config
  for select using (true);

create policy "Config admin/PM yazar" on public.santiye_config
  for insert with check (santiye_is_admin() or santiye_is_pm());

create policy "Config admin/PM gunceller" on public.santiye_config
  for update using (santiye_is_admin() or santiye_is_pm())
  with check (santiye_is_admin() or santiye_is_pm());

create policy "Config admin/PM siler" on public.santiye_config
  for delete using (santiye_is_admin() or santiye_is_pm());

-- Raporlar
create policy "Raporlar herkes gorur" on public.raporlar
  for select using (true);

create policy "Raporlar kendi adina ekler" on public.raporlar
  for insert with check (
    raporlayan = santiye_ad_soyad() or santiye_is_admin() or santiye_is_pm()
  );

create policy "Raporlar kendi adina gunceller" on public.raporlar
  for update using (
    raporlayan = santiye_ad_soyad() or santiye_is_admin() or santiye_is_pm()
  )
  with check (
    raporlayan = santiye_ad_soyad() or santiye_is_admin() or santiye_is_pm()
  );

create policy "Raporlar kendi adina siler" on public.raporlar
  for delete using (
    raporlayan = santiye_ad_soyad() or santiye_is_admin() or santiye_is_pm()
  );

-- Ada atamalari
create policy "Ada atamalari herkes gorur" on public.kullanici_ada_atamalari
  for select using (true);

create policy "Ada atamalari admin/PM ekler" on public.kullanici_ada_atamalari
  for insert with check (
    santiye_is_pm() or (santiye_is_admin() and ada = any(santiye_yetkili_adalar()))
  );

create policy "Ada atamalari admin/PM gunceller" on public.kullanici_ada_atamalari
  for update using (
    santiye_is_pm() or (santiye_is_admin() and ada = any(santiye_yetkili_adalar()))
  )
  with check (
    santiye_is_pm() or (santiye_is_admin() and ada = any(santiye_yetkili_adalar()))
  );

create policy "Ada atamalari admin/PM siler" on public.kullanici_ada_atamalari
  for delete using (
    santiye_is_pm() or (santiye_is_admin() and ada = any(santiye_yetkili_adalar()))
  );

-- Blok atamalari
create policy "Blok atamalari herkes gorur" on public.kullanici_blok_atamalari
  for select using (true);

create policy "Blok atamalari admin/PM ekler" on public.kullanici_blok_atamalari
  for insert with check (
    santiye_is_pm() or (santiye_is_admin() and ada = any(santiye_yetkili_adalar()))
  );

create policy "Blok atamalari admin/PM gunceller" on public.kullanici_blok_atamalari
  for update using (
    santiye_is_pm() or (santiye_is_admin() and ada = any(santiye_yetkili_adalar()))
  )
  with check (
    santiye_is_pm() or (santiye_is_admin() and ada = any(santiye_yetkili_adalar()))
  );

create policy "Blok atamalari admin/PM siler" on public.kullanici_blok_atamalari
  for delete using (
    santiye_is_pm() or (santiye_is_admin() and ada = any(santiye_yetkili_adalar()))
  );

-- Hedef tarihleri
create policy "Hedefler herkes gorur" on public.is_kalemi_hedefleri
  for select using (true);

create policy "Hedefler admin/PM yazar" on public.is_kalemi_hedefleri
  for insert with check (santiye_is_admin() or santiye_is_pm());

create policy "Hedefler admin/PM gunceller" on public.is_kalemi_hedefleri
  for update using (santiye_is_admin() or santiye_is_pm())
  with check (santiye_is_admin() or santiye_is_pm());

create policy "Hedefler admin/PM siler" on public.is_kalemi_hedefleri
  for delete using (santiye_is_admin() or santiye_is_pm());

-- Indexes
create index if not exists idx_raporlar_user_id on public.raporlar(user_id);
create index if not exists idx_raporlar_ada on public.raporlar(ada);
create index if not exists idx_raporlar_raporlayan on public.raporlar(raporlayan);
create index if not exists idx_raporlar_durum on public.raporlar(durum);
create index if not exists idx_raporlar_ada_is_kalemi on public.raporlar(ada, is_kalemi);
create index if not exists idx_kullanicilar_ada on public.kullanicilar(atanan_ada);

-- ============================================================
-- Realtime
-- ============================================================
alter publication supabase_realtime add table public.raporlar;
alter publication supabase_realtime add table public.kullanicilar;
alter publication supabase_realtime add table public.kullanici_ada_atamalari;
alter publication supabase_realtime add table public.kullanici_blok_atamalari;
alter publication supabase_realtime add table public.santiye_config;
