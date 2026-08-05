// Kullanicilar (auth.users + auth.identities + public.kullanicilar) seed'ini
// SQL migrasyonu olarak uretir. Service role anahtari GEREKMEZ.
// santiye_config icin minik baslangic satiri yazar; tam config bundle icindeki
// santiye.config.json'dan gelir (admin paneli ilk kayit sonrasi DB'ye yazilir).
//   npm run seed:migration
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

process.loadEnvFile();
const DEFAULT_PASSWORD = process.env.VITE_DEFAULT_PASSWORD || 'Santiye2026';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
const migDir = join(__dirname, '..', 'supabase', 'migrations');

const personel = JSON.parse(readFileSync(join(dataDir, 'personel.json'), 'utf8'));
const cfg = JSON.parse(readFileSync(join(dataDir, 'santiye.config.json'), 'utf8'));

const EMAIL_DOMAIN = cfg.marka?.emailDomain ?? 'santiye.com';
const VERSION = cfg.version ?? 2;

const TURKCE_MAP = {
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
  Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u',
  â: 'a', î: 'i', û: 'u',
};

function slug(ad_soyad) {
  return ad_soyad
    .toLowerCase()
    .split('')
    .map((ch) => TURKCE_MAP[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9.]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

function adalarListesi() {
  const adalar = personel.santiye_sefleri.flatMap((s) => s.adalar);
  return adalar.length > 0 ? adalar : ['ADA-1', 'ADA-2', 'ADA-3', 'ADA-4', 'ADA-5', 'ADA-6'];
}

const kayitlar = [];
for (const sef of personel.santiye_sefleri) {
  kayitlar.push({
    email: `${slug(sef.ad_soyad)}@${EMAIL_DOMAIN}`,
    ad_soyad: sef.ad_soyad,
    rol: 'Şantiye Şefi',
    admin: true,
    proje_muduru: false,
    yetkili_adalar: sef.adalar,
    atanan_ada: null,
  });
}
for (const p of personel.personel) {
  kayitlar.push({
    email: `${slug(p.ad_soyad)}@${EMAIL_DOMAIN}`,
    ad_soyad: p.ad_soyad,
    rol: p.rol,
    admin: false,
    proje_muduru: !!p.proje_muduru,
    yetkili_adalar: p.proje_muduru ? adalarListesi() : [],
    atanan_ada: p.atanan_ada ?? null,
  });
}

const sqlStr = (s) => String(s).replace(/'/g, "''");

const lines = [];
lines.push('-- Otomatik uretildi: scripts/seed-migration.mjs');
lines.push(`-- Kullanicilar (${kayitlar.length}) + santiye_config baslangic satiri. Idempotent.`);
lines.push('');

lines.push('-- 1) handle_new_user trigger duzeltmesi: yetkili_adalar JSON dizisi text[] e');
lines.push('--    dogru cevrilmeli (->> cast hataliydi).');
lines.push('create or replace function public.handle_new_user()');
lines.push('returns trigger');
lines.push('language plpgsql');
lines.push('security definer');
lines.push('set search_path = public');
lines.push('as $$');
lines.push('declare');
lines.push('  v_adalar text[] := coalesce(');
lines.push("    (select array(select jsonb_array_elements_text(new.raw_user_meta_data -> 'yetkili_adalar'))),");
lines.push("    '{}'::text[]");
lines.push('  );');
lines.push('begin');
lines.push('  insert into public.kullanicilar (id, ad_soyad, rol, admin, yetkili_adalar, proje_muduru)');
lines.push('  values (');
lines.push('    new.id,');
lines.push("    coalesce(new.raw_user_meta_data ->> 'ad_soyad', new.email),");
lines.push("    coalesce(new.raw_user_meta_data ->> 'rol', 'Personel'),");
lines.push("    coalesce((new.raw_user_meta_data ->> 'admin')::boolean, false),");
lines.push('    v_adalar,');
lines.push("    coalesce((new.raw_user_meta_data ->> 'proje_muduru')::boolean, false)");
lines.push('  )');
lines.push('  on conflict (id) do nothing;');
lines.push('  return new;');
lines.push('end');
lines.push('$$;');
lines.push('');

lines.push('-- 2) Kullanicilar (auth.users + identities + kullanicilar)');
lines.push('do $$');
lines.push('declare');
lines.push('  v_uid uuid;');
lines.push('  v_email text;');
lines.push('  v_meta jsonb;');
lines.push('  v_adalar text[];');
lines.push('  k jsonb;');
lines.push('begin');
lines.push('  foreach k in array array[');
for (const [i, k] of kayitlar.entries()) {
  const rec = {
    email: k.email,
    ad_soyad: k.ad_soyad,
    rol: k.rol,
    admin: k.admin,
    proje_muduru: k.proje_muduru,
    yetkili_adalar: k.yetkili_adalar,
    atanan_ada: k.atanan_ada,
  };
  const comma = i < kayitlar.length - 1 ? ',' : '';
  lines.push(`    '${sqlStr(JSON.stringify(rec))}'::jsonb${comma}`);
}
lines.push('  ] loop');
lines.push(`    v_email := k ->> 'email';`);
lines.push('    select id into v_uid from auth.users where email = v_email and deleted_at is null;');
lines.push('    if v_uid is null then');
lines.push('      v_uid := gen_random_uuid();');
lines.push('      v_meta := jsonb_build_object(');
lines.push("        'ad_soyad', k ->> 'ad_soyad',");
lines.push("        'rol', k ->> 'rol',");
lines.push("        'admin', (k ->> 'admin')::boolean,");
lines.push("        'proje_muduru', (k ->> 'proje_muduru')::boolean,");
lines.push("        'yetkili_adalar', k -> 'yetkili_adalar'");
lines.push('      );');
lines.push('      insert into auth.users (');
lines.push('        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,');
lines.push('        confirmation_token, recovery_token, email_change, email_change_token_new,');
lines.push('        raw_app_meta_data, raw_user_meta_data,');
lines.push('        created_at, updated_at, is_sso_user');
lines.push('      ) values (');
lines.push("        '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',");
lines.push(`        v_email, extensions.crypt('${sqlStr(DEFAULT_PASSWORD)}', extensions.gen_salt('bf')), now(),`);
lines.push("        '', '', '', '',");
lines.push("        '{\"provider\":\"email\",\"providers\":[\"email\"]}'::jsonb,");
lines.push('        v_meta, now(), now(), false');
lines.push('      );');
lines.push('      insert into auth.identities (');
lines.push('        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at');
lines.push('      ) values (');
lines.push("        v_uid, v_uid::text, v_uid,");
lines.push("        jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),");
lines.push("        'email', now(), now(), now()");
lines.push('      );');
lines.push('    end if;');
lines.push('');
lines.push('    v_adalar := coalesce((select array(select jsonb_array_elements_text(k -> \'yetkili_adalar\'))), \'{}\'::text[]);');
lines.push('    insert into public.kullanicilar (id, ad_soyad, rol, admin, yetkili_adalar, atanan_ada, proje_muduru)');
lines.push('    values (');
lines.push("      v_uid, k ->> 'ad_soyad', k ->> 'rol', (k ->> 'admin')::boolean,");
lines.push('      v_adalar,');
lines.push("      nullif(k ->> 'atanan_ada', ''), (k ->> 'proje_muduru')::boolean");
lines.push('    )');
lines.push('    on conflict (id) do update set');
lines.push('      ad_soyad = excluded.ad_soyad,');
lines.push('      rol = excluded.rol,');
lines.push('      admin = excluded.admin,');
lines.push('      yetkili_adalar = excluded.yetkili_adalar,');
lines.push('      atanan_ada = excluded.atanan_ada,');
lines.push('      proje_muduru = excluded.proje_muduru;');
lines.push('  end loop;');
lines.push('end');
lines.push('$$;');
lines.push('');

lines.push('-- 3) Santiye config baslangic satiri (tam icerik bundle config ten gelir)');
lines.push('insert into public.santiye_config (id, config, version, updated_at)');
lines.push(`values (1, '{}'::jsonb, ${VERSION}, now())`);
lines.push('on conflict (id) do update set version = excluded.version, updated_at = now();');
lines.push('');

const sql = lines.join('\n');
const out = join(migDir, '0003_seed_baslangic.sql');
writeFileSync(out, sql, 'utf8');
console.log(`OK: ${out} yazildi (${sql.length} byte, ${kayitlar.length} kullanici).`);
