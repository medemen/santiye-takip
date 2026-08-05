-- Otomatik uretildi: scripts/seed-migration.mjs
-- Kullanicilar (36) + santiye_config baslangic satiri. Idempotent.

-- 1) handle_new_user trigger duzeltmesi: yetkili_adalar JSON dizisi text[] e
--    dogru cevrilmeli (->> cast hataliydi).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_adalar text[] := coalesce(
    (select array(select jsonb_array_elements_text(new.raw_user_meta_data -> 'yetkili_adalar'))),
    '{}'::text[]
  );
begin
  insert into public.kullanicilar (id, ad_soyad, rol, admin, yetkili_adalar, proje_muduru)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'ad_soyad', new.email),
    coalesce(new.raw_user_meta_data ->> 'rol', 'Personel'),
    coalesce((new.raw_user_meta_data ->> 'admin')::boolean, false),
    v_adalar,
    coalesce((new.raw_user_meta_data ->> 'proje_muduru')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end
$$;

-- 2) Kullanicilar (auth.users + identities + kullanicilar)
do $$
declare
  v_uid uuid;
  v_email text;
  v_meta jsonb;
  v_adalar text[];
  k jsonb;
begin
  foreach k in array array[
    '{"email":"mehmet.orhan.edemen@santiye.com","ad_soyad":"Mehmet Orhan Edemen","rol":"Şantiye Şefi","admin":true,"proje_muduru":false,"yetkili_adalar":["ADA-1","ADA-2"],"atanan_ada":null}'::jsonb,
    '{"email":"safak.bektas.atmali@santiye.com","ad_soyad":"Şafak Bektaş Atmalı","rol":"Şantiye Şefi","admin":true,"proje_muduru":false,"yetkili_adalar":["ADA-3","ADA-4"],"atanan_ada":null}'::jsonb,
    '{"email":"cihan.erdogan@santiye.com","ad_soyad":"Cihan Erdoğan","rol":"Şantiye Şefi","admin":true,"proje_muduru":false,"yetkili_adalar":["ADA-5","ADA-6"],"atanan_ada":null}'::jsonb,
    '{"email":"alp.dora.alasehirli@santiye.com","ad_soyad":"Alp Dora Alaşehirli","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"fatma.tugce.armut@santiye.com","ad_soyad":"Fatma Tuğçe Armut","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"mehmet.kilic@santiye.com","ad_soyad":"Mehmet Kılıç","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"kamuran.erez@santiye.com","ad_soyad":"Kamuran Erez","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"omer.bugra.ozlu@santiye.com","ad_soyad":"Ömer Buğra Özlü","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"sadik.umut.mutlu@santiye.com","ad_soyad":"Sadık Umut Mutlu","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"ahmet.belgin@santiye.com","ad_soyad":"Ahmet Belgin","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"abdullah.kilic@santiye.com","ad_soyad":"Abdullah Kılıç","rol":"Formen","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"duran.arici@santiye.com","ad_soyad":"Duran Arıcı","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"nurselin.ekinci@santiye.com","ad_soyad":"Nurselin Ekinci","rol":"Saha Mimarı","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"fethi.yildirim@santiye.com","ad_soyad":"Fethi Yıldırım","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"turgay.turgut@santiye.com","ad_soyad":"Turgay Turgut","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"erkan.karabas@santiye.com","ad_soyad":"Erkan Karabaş","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"sinem.ozkan@santiye.com","ad_soyad":"Sinem Özkan","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"volkan.baran@santiye.com","ad_soyad":"Volkan Baran","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"kerem.colakoglu@santiye.com","ad_soyad":"Kerem Çolakoğlu","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"alperen.koc@santiye.com","ad_soyad":"Alperen Koç","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"burak.ugurlu@santiye.com","ad_soyad":"Burak Uğurlu","rol":"Formen","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"ahmet.oz@santiye.com","ad_soyad":"Ahmet Öz","rol":"Formen","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"nevzat.yildirim@santiye.com","ad_soyad":"Nevzat Yıldırım","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"tuba.saatci@santiye.com","ad_soyad":"Tuba Saatçi","rol":"Saha Mimarı","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"ahmet.celik@santiye.com","ad_soyad":"Ahmet Çelik","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"recep.er@santiye.com","ad_soyad":"Recep Er","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"kayhan.tarhan@santiye.com","ad_soyad":"Kayhan Tarhan","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"ahmet.aslan@santiye.com","ad_soyad":"Ahmet Aslan","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"riza.polat@santiye.com","ad_soyad":"Rıza Polat","rol":"Saha Teknikeri","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"ahmet.sakar@santiye.com","ad_soyad":"Ahmet Sakar","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"malik.taysan@santiye.com","ad_soyad":"Malik Tayşan","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"murat.zavran@santiye.com","ad_soyad":"Murat Zavran","rol":"Saha Mühendisi","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"muhammed.furkan.gezer@santiye.com","ad_soyad":"Muhammed Furkan Gezer","rol":"Formen","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"hamit.yildizli@santiye.com","ad_soyad":"Hamit Yıldızlı","rol":"Formen","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"erkan.zevkirlioglu@santiye.com","ad_soyad":"Erkan Zevkirlioğlu","rol":"Formen","admin":false,"proje_muduru":false,"yetkili_adalar":[],"atanan_ada":null}'::jsonb,
    '{"email":"proje.muduru@santiye.com","ad_soyad":"Proje Müdürü","rol":"Proje Müdürü","admin":false,"proje_muduru":true,"yetkili_adalar":["ADA-1","ADA-2","ADA-3","ADA-4","ADA-5","ADA-6"],"atanan_ada":null}'::jsonb
  ] loop
    v_email := k ->> 'email';
    select id into v_uid from auth.users where email = v_email and deleted_at is null;
    if v_uid is null then
      v_uid := gen_random_uuid();
      v_meta := jsonb_build_object(
        'ad_soyad', k ->> 'ad_soyad',
        'rol', k ->> 'rol',
        'admin', (k ->> 'admin')::boolean,
        'proje_muduru', (k ->> 'proje_muduru')::boolean,
        'yetkili_adalar', k -> 'yetkili_adalar'
      );
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        confirmation_token, recovery_token, email_change, email_change_token_new,
        raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, is_sso_user
      ) values (
        '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
        v_email, extensions.crypt('Santiye2026', extensions.gen_salt('bf')), now(),
        '', '', '', '',
        '{"provider":"email","providers":["email"]}'::jsonb,
        v_meta, now(), now(), false
      );
      insert into auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) values (
        v_uid, v_uid::text, v_uid,
        jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
        'email', now(), now(), now()
      );
    end if;

    v_adalar := coalesce((select array(select jsonb_array_elements_text(k -> 'yetkili_adalar'))), '{}'::text[]);
    insert into public.kullanicilar (id, ad_soyad, rol, admin, yetkili_adalar, atanan_ada, proje_muduru)
    values (
      v_uid, k ->> 'ad_soyad', k ->> 'rol', (k ->> 'admin')::boolean,
      v_adalar,
      nullif(k ->> 'atanan_ada', ''), (k ->> 'proje_muduru')::boolean
    )
    on conflict (id) do update set
      ad_soyad = excluded.ad_soyad,
      rol = excluded.rol,
      admin = excluded.admin,
      yetkili_adalar = excluded.yetkili_adalar,
      atanan_ada = excluded.atanan_ada,
      proje_muduru = excluded.proje_muduru;
  end loop;
end
$$;

-- 3) Santiye config baslangic satiri (tam icerik bundle config ten gelir)
insert into public.santiye_config (id, config, version, updated_at)
values (1, '{}'::jsonb, 2, now())
on conflict (id) do update set version = excluded.version, updated_at = now();
