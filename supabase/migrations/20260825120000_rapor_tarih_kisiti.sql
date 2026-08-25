-- Rapor tarihi kisiti: gelecek tarihli rapor kaydini DB seviyesinde engeller.
--
-- Neden tetik? CHECK kisiti CURRENT_DATE / now() gibi stable ifadeleri
-- kabul etmez; BEFORE trigger dogru yerdir.
--
-- Neden Europe/Istanbul? Client tarafindaki todayISO() cihazin YEREL
-- tarihini verir. Turkiye kalici UTC+3 oldugu icin DB UTC current_date'i
-- yerel gecenin 00:00-03:00 arasinda bir gun geride kalir ve mesai
-- basi kayitlari haksizca reddedilirdi. Istanbul takvimi client ile
-- birebir ayni anlama gelir.
--
-- Client'taki ayna kontrol: src/pages/ReportAdd.tsx + src/utils/helpers.ts
-- (gelecektekiTarihMi). Asil guvenlik siniri burasi — client kontrolu UX.

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
