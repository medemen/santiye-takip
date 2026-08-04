-- Blok atamalari updated_at (remote'da 20260731134629_blok_atamalari_updated_at ile eslestirildi)
alter table public.kullanici_blok_atamalari add column if not exists updated_at timestamptz default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists kullanici_blok_atamalari_set_updated_at on public.kullanici_blok_atamalari;
create trigger kullanici_blok_atamalari_set_updated_at
before update on public.kullanici_blok_atamalari
for each row execute procedure public.set_updated_at();
