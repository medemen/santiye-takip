-- Rapor fotograflari: Storage tabanli. Eski tablo (drop_rapor_fotograflar) artik
-- Storage public bucket + meta tablo ile geri geliyor.
-- rapor_id bilerek FK'siz text (offline-first: rapor satiri sunucuya
-- ulasmadan foto yuklenebilir); silmede tablo uzerinden temizlenir.

create table if not exists public.rapor_fotograflar (
  id uuid primary key default gen_random_uuid(),
  rapor_id text not null,
  dosya_yolu text not null,
  created_at timestamptz default now()
);
alter table public.rapor_fotograflar enable row level security;

create index if not exists idx_rapor_fotograflar_rapor_id on public.rapor_fotograflar(rapor_id);

create policy "Rapor fotolari herkes gorur" on public.rapor_fotograflar
  for select using (true);

create policy "Rapor fotolari ilgili rapor sahibi/admin/PM ekler" on public.rapor_fotograflar
  for insert with check (
    santiye_is_admin() or santiye_is_pm()
    or exists (
      select 1 from public.raporlar r
      where r.id::text = rapor_id and r.raporlayan = santiye_ad_soyad()
    )
  );

create policy "Rapor fotolari ilgili rapor sahibi/admin/PM siler" on public.rapor_fotograflar
  for delete using (
    santiye_is_admin() or santiye_is_pm()
    or exists (
      select 1 from public.raporlar r
      where r.id::text = rapor_id and r.raporlayan = santiye_ad_soyad()
    )
  );

-- Storage bucket (public: fotograflar URL ile gosterilir)
insert into storage.buckets (id, name, public)
values ('rapor_fotograflar', 'rapor_fotograflar', true)
on conflict (id) do nothing;

create policy "Rapor fotolari yukleme" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'rapor_fotograflar');

create policy "Rapor fotolari herkes okur" on storage.objects
  for select to public
  using (bucket_id = 'rapor_fotograflar');

create policy "Rapor fotolari sahibi/admin/PM siler" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'rapor_fotograflar'
    and (owner_id = auth.uid()::text or santiye_is_admin() or santiye_is_pm())
  );
