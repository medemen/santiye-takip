-- Denetim kaydi (audit trail): kritik tablolardaki degisikliklerin kim,
-- ne zaman, neyi degistirdigi sorusuna cevap verir.
--
-- Kapsam: raporlar, is_kalemi_hedefleri, kullanicilar.
-- Yazma: hicbir ROL dogrudan yazamaz (insert/update/delete politikalari
--        yoktur; RLS varsayilan reddeder). Kayitlar yalnizca asagidaki
--        SECURITY DEFINER tetikleyici tarafindan uretilir.
-- Okuma: yalnizca santiye sefi (admin) ve proje muduru.
--
-- Idempotentdir; mevcut veriyi degistirmez.

-- ============================================================
-- 1) audit_log tablosu
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

-- ============================================================
-- 2) Tetikleyici fonksiyonu (SECURITY DEFINER; RLS'i asan tek yol)
--    DELETE tetikleyicisinde NEW tanimsiz oldugundan referanslar
--    tg_op ile dallandirilir.
-- ============================================================
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

-- ============================================================
-- 3) Tetikleyiciler
-- ============================================================
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

-- ============================================================
-- 4) RLS: yalnizca sef/PM okur; yazma politikasi bilincli olarak YOKTUR
-- ============================================================
drop policy if exists "Denetim kaydi sef ve PM gorur" on public.audit_log;
create policy "Denetim kaydi sef ve PM gorur" on public.audit_log
  for select using (
    (select santiye_is_admin()) or (select santiye_is_pm())
  );
