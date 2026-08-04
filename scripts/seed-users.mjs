// Kullanicilari auth.users + kullanicilar'a yazar (idempotent).
// Kullanim: .env icinde SUPABASE_SERVICE_ROLE_KEY tanimlanmali.
//   npm run seed:users
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

process.loadEnvFile();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !serviceRoleKey) {
  console.error('.env icinde VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY yok.');
  process.exit(1);
}

const DEFAULT_PASSWORD = process.env.VITE_DEFAULT_PASSWORD || 'Santiye2026';

const sb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const personel = JSON.parse(
  readFileSync(join(__dirname, '..', 'data', 'personel.json'), 'utf8')
);

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

function email(ad_soyad) {
  return `${slug(ad_soyad)}@santiye.com`;
}

function adalarListesi() {
  const adalar = personel.santiye_sefleri.flatMap((s) => s.adalar);
  return adalar.length > 0 ? adalar : ['ADA-1', 'ADA-2', 'ADA-3', 'ADA-4', 'ADA-5', 'ADA-6'];
}

const kayitlar = [];

for (const sef of personel.santiye_sefleri) {
  kayitlar.push({
    ad_soyad: sef.ad_soyad,
    rol: 'Şantiye Şefi',
    admin: true,
    proje_muduru: false,
    yetkili_adalar: sef.adalar,
  });
}

for (const p of personel.personel) {
  kayitlar.push({
    ad_soyad: p.ad_soyad,
    rol: p.rol,
    admin: false,
    proje_muduru: !!p.proje_muduru,
    yetkili_adalar: p.proje_muduru ? adalarListesi() : [],
  });
}

async function mevcutKullanicilar() {
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return new Map(data.users.map((u) => [u.email, u]));
}

async function ensureUser(kayit, mevcut) {
  const eposta = email(kayit.ad_soyad);
  const meta = {
    ad_soyad: kayit.ad_soyad,
    rol: kayit.rol,
    admin: kayit.admin,
    proje_muduru: kayit.proje_muduru,
    yetkili_adalar: kayit.yetkili_adalar,
  };
  const varolan = mevcut.get(eposta);
  if (varolan) {
    const { error } = await sb.auth.admin.updateUserById(varolan.id, {
      password: DEFAULT_PASSWORD,
      user_metadata: meta,
    });
    if (error) throw error;
    return { eposta, durum: 'guncellendi' };
  }
  const { error } = await sb.auth.admin.createUser({
    email: eposta,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: meta,
  });
  if (error) throw error;
  return { eposta, durum: 'olusturuldu' };
}

const mevcut = await mevcutKullanicilar();
const sonuclar = [];
for (const kayit of kayitlar) {
  sonuclar.push(await ensureUser(kayit, mevcut));
}

const sayilar = sonuclar.reduce(
  (acc, s) => { acc[s.durum] = (acc[s.durum] ?? 0) + 1; return acc; },
  {}
);
console.log(`Kullanicilar tamam: olusturuldu=${sayilar.olusturuldu ?? 0}, guncellendi=${sayilar.guncellendi ?? 0}`);
for (const s of sonuclar) console.log(`  ${s.durum}: ${s.eposta}`);
