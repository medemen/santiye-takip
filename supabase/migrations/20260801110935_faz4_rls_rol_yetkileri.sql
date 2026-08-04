-- Faz 4: RLS & rol bazli yetkilendirme (remote'da 20260801110935_faz4_rls_rol_yetkileri ile eslestirildi)
alter table public.kullanicilar add column if not exists proje_muduru boolean not null default false;
alter table public.raporlar add column if not exists user_id uuid references auth.users(id);
alter table public.kullanici_ada_atamalari add column if not exists user_id uuid references auth.users(id);
alter table public.kullanici_blok_atamalari add column if not exists user_id uuid references auth.users(id);

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

-- Faz 4: rol bazli RLS politikalari
drop policy if exists "Kullanicilar kendini gunceller" on public.kullanicilar;
create policy "Kullanicilar kendini veya admin gunceller" on public.kullanicilar
  for update using (auth.uid() = id or santiye_is_admin())
  with check (auth.uid() = id or santiye_is_admin());

drop policy if exists "Raporlar herkes ekler" on public.raporlar;
drop policy if exists "Raporlar herkes gunceller" on public.raporlar;
drop policy if exists "Raporlar sahibi gunceller" on public.raporlar;
drop policy if exists "Raporlar herkes siler" on public.raporlar;
drop policy if exists "Raporlar admin siler" on public.raporlar;

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

drop policy if exists "Ada atamalari herkes ekler" on public.kullanici_ada_atamalari;
drop policy if exists "Ada atamalari herkes gunceller" on public.kullanici_ada_atamalari;
drop policy if exists "Ada atamalari herkes siler" on public.kullanici_ada_atamalari;

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

drop policy if exists "Blok atamalari herkes ekler" on public.kullanici_blok_atamalari;
drop policy if exists "Blok atamalari herkes gunceller" on public.kullanici_blok_atamalari;
drop policy if exists "Blok atamalari herkes siler" on public.kullanici_blok_atamalari;

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

create policy "Adalar admin/PM yazar" on public.adalar
  for insert with check (santiye_is_admin() or santiye_is_pm());

create policy "Adalar admin/PM gunceller" on public.adalar
  for update using (santiye_is_admin() or santiye_is_pm())
  with check (santiye_is_admin() or santiye_is_pm());

create policy "Adalar admin/PM siler" on public.adalar
  for delete using (santiye_is_admin() or santiye_is_pm());

create policy "Bloklar admin/PM yazar" on public.bloklar
  for insert with check (santiye_is_admin() or santiye_is_pm());

create policy "Bloklar admin/PM gunceller" on public.bloklar
  for update using (santiye_is_admin() or santiye_is_pm())
  with check (santiye_is_admin() or santiye_is_pm());

create policy "Bloklar admin/PM siler" on public.bloklar
  for delete using (santiye_is_admin() or santiye_is_pm());

create policy "Hedefler admin/PM yazar" on public.is_kalemi_hedefleri
  for insert with check (santiye_is_admin() or santiye_is_pm());

create policy "Hedefler admin/PM gunceller" on public.is_kalemi_hedefleri
  for update using (santiye_is_admin() or santiye_is_pm())
  with check (santiye_is_admin() or santiye_is_pm());

create policy "Hedefler admin/PM siler" on public.is_kalemi_hedefleri
  for delete using (santiye_is_admin() or santiye_is_pm());

create index if not exists idx_raporlar_user_id on public.raporlar(user_id);
