-- RLS ve ilk politikalar (remote'da 20260730124306_enable_rls_and_policies ile eslestirildi)
alter table public.kullanicilar enable row level security;
alter table public.adalar enable row level security;
alter table public.bloklar enable row level security;
alter table public.raporlar enable row level security;
alter table public.kullanici_ada_atamalari enable row level security;
alter table public.kullanici_blok_atamalari enable row level security;
alter table public.is_kalemi_hedefleri enable row level security;

create policy "Kullanicilar herkes gorur" on public.kullanicilar for select using (true);
create policy "Kullanicilar kendini gunceller" on public.kullanicilar for update using (auth.uid() = id);

create policy "Raporlar herkes gorur" on public.raporlar for select using (true);
create policy "Raporlar herkes ekler" on public.raporlar for insert with check (true);
create policy "Raporlar sahibi gunceller" on public.raporlar for update using (raporlayan = (select ad_soyad from public.kullanicilar where id = auth.uid()));
create policy "Raporlar admin siler" on public.raporlar for delete using (
  (select admin from public.kullanicilar where id = auth.uid()) = true
);

create index if not exists idx_raporlar_ada on public.raporlar(ada);
create index if not exists idx_raporlar_raporlayan on public.raporlar(raporlayan);
create index if not exists idx_raporlar_durum on public.raporlar(durum);
