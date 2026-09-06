-- Rapor sablonu aciklama zorunlulugunun sunucu tarafi karsiligi.
-- `santiye_config.raporSablonu.aciklamaZorunluKalemler` listesindeki bir
-- is kalemiyle rapor yazilirken/guncellenirken aciklama bos olamaz.
-- Client (ReportAdd) ayni kurali UX olarak zaten uygular; bu trigger
-- dogrudan API yazimlarinda atlatilmayi engeller. Liste bossa no-op'tur.

create or replace function public.rapor_aciklama_korumasi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_zorunlu text[] := '{}'::text[];
begin
  select coalesce(
    (
      select array_agg(x)
      from jsonb_array_elements_text(config->'raporSablonu'->'aciklamaZorunluKalemler') as t(x)
    ),
    '{}'::text[]
  )
  into v_zorunlu
  from public.santiye_config
  where id = 1;

  if new.is_kalemi = any(v_zorunlu) and coalesce(btrim(new.aciklama), '') = '' then
    raise exception 'Bu is kalemi icin aciklama zorunludur: %', new.is_kalemi;
  end if;
  return new;
end;
$$;

drop trigger if exists rapor_aciklama_korumasi on public.raporlar;
create trigger rapor_aciklama_korumasi
before insert or update of is_kalemi, aciklama on public.raporlar
for each row execute procedure public.rapor_aciklama_korumasi();

revoke execute on function public.rapor_aciklama_korumasi() from public;
