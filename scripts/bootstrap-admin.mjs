// Proje yoneticisi/admin kullanicisini olusturur veya gunceller (idempotent).
// Yeni bir santiye kurulumunda garantili bir admin girisinin olmasini saglar.
// Kullanim: .env icinde SUPABASE_SERVICE_ROLE_KEY tanimlanmali.
//   npm run bootstrap:admin                     (varsayilan: personel.json'daki ilk sef)
//   npm run bootstrap:admin -- <email>          (belirli eposta)
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

const config = JSON.parse(
  readFileSync(join(__dirname, '..', 'data', 'santiye.config.json'), 'utf8')
);
const EMAIL_DOMAIN = config.marka?.emailDomain ?? 'santiye.com';
const tumAdalar = config.yapi?.adalar?.map((a) => a.ada) ?? [];

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
  return `${slug(ad_soyad)}@${EMAIL_DOMAIN}`;
}

// Argv'den eposta veya ad_soyad alinir; yoksa ilk santiye sefi kullanilir.
const arg = process.argv[2];
let ad_soyad = '';
let eposta = '';

if (arg) {
  if (arg.includes('@')) {
    eposta = arg.toLowerCase();
    const kisi = personel.santiye_sefleri.find((s) => email(s.ad_soyad) === eposta);
    ad_soyad = kisi?.ad_soyad ?? eposta.split('@')[0];
  } else {
    ad_soyad = arg;
    eposta = email(ad_soyad);
  }
} else if (personel.santiye_sefleri.length > 0) {
  ad_soyad = personel.santiye_sefleri[0].ad_soyad;
  eposta = email(ad_soyad);
} else {
  console.error('Admin belirtilmedi: eposta/adi verin veya personel.json\'da sef tanimlayin.');
  process.exit(1);
}

const meta = {
  ad_soyad,
  rol: 'Proje Müdürü',
  admin: true,
  proje_muduru: true,
  yetkili_adalar: tumAdalar,
};

const { data: mevcutListe, error: listeHatasi } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
if (listeHatasi) throw listeHatasi;
const mevcut = mevcutListe.users.find((u) => u.email?.toLowerCase() === eposta);

let userId;
if (mevcut) {
  const { data, error } = await sb.auth.admin.updateUserById(mevcut.id, {
    password: DEFAULT_PASSWORD,
    user_metadata: meta,
  });
  if (error) throw error;
  userId = data.user.id;
  console.log(`Auth kullanicisi guncellendi: ${eposta}`);
} else {
  const { data, error } = await sb.auth.admin.createUser({
    email: eposta,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: meta,
  });
  if (error) throw error;
  userId = data.user.id;
  console.log(`Auth kullanicisi olusturuldu: ${eposta}`);
}

const { error } = await sb.from('kullanicilar').upsert(
  {
    id: userId,
    ad_soyad,
    rol: meta.rol,
    admin: meta.admin,
    proje_muduru: meta.proje_muduru,
    yetkili_adalar: meta.yetkili_adalar,
    atanan_ada: null,
  },
  { onConflict: 'id' }
);
if (error) throw error;

console.log(`OK: admin hazir -> ${eposta} / ${DEFAULT_PASSWORD}`);
console.log(`Rol: ${meta.rol}, yetkili adalar: ${tumAdalar.length > 0 ? tumAdalar.join(', ') : '(hepsi)'}`);
