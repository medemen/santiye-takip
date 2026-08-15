// Yeni bir santiye icin veri dosyalari sablonu olusturur.
// Kullanim:
//   node scripts/new-santiye.mjs <slug> [--dest data] [--force]
//
// Sablonlar root `data/` klasorune yazilir (build-config/validate-config buradan okur).
// Mevcut dosyalar varsa --force ister; aksi halde --dest ile baska klasor verin.
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

const slug = args.find((a) => !a.startsWith('--'));
const force = args.includes('--force');

function argDeger(ad) {
  const e = args.find((a) => a.startsWith(`${ad}=`));
  if (e) return e.split('=')[1];
  const idx = args.indexOf(ad);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) return args[idx + 1];
  return null;
}

if (!slug) {
  console.error('Kullanim: node scripts/new-santiye.mjs <slug> [--dest data] [--force]');
  process.exit(1);
}

if (!/^[a-z0-9][a-z0-9_-]*$/.test(slug)) {
  console.error('Slug yalnizca kucuk harf, rakam, - ve _ icermeli.');
  process.exit(1);
}

const dest = argDeger('--dest') ?? 'data';
const destDir = join(__dirname, '..', dest);
mkdirSync(destDir, { recursive: true });

const hedefDosyalar = [
  'config-basics.json',
  'adalar_bloklar.json',
  'durum_tespit.json',
  'personel.json',
];

const mevcut = hedefDosyalar.filter((f) => existsSync(join(destDir, f)));
if (mevcut.length > 0 && !force) {
  console.error(
    `${dest}/ icinde zaten veri dosyalari var: ${mevcut.join(', ')}. --force verin veya --dest kullanin.`
  );
  process.exit(1);
}

const emailDomain = process.env.NEW_SITE_EMAIL_DOMAIN || `${slug}.santiye.com`;

const sablon = {
  'config-basics.json': {
    genel: {
      santiyeAdi: slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      projeAdi: '',
      musteri: '',
    },
    marka: {
      appName: slug.toUpperCase().replace(/[-_]/g, ''),
      webBasename: `/${slug}`,
      emailDomain,
      localStoragePrefix: slug,
      capacitorAppId: `com.${slug}.app`,
    },
    roller: {
      sahaPersoneliRolleri: ['Saha Mühendisi', 'Saha Mimarı', 'Saha Teknikeri', 'Formen'],
      secilebilirRoller: [
        'Saha Mühendisi',
        'Saha Mimarı',
        'Saha Teknikeri',
        'Formen',
        'Şantiye Şefi',
        'Proje Müdürü',
      ],
    },
    isKalemleri: {
      gruplar: [],
    },
  },
  'adalar_bloklar.json': { adalar: [] },
  'durum_tespit.json': {
    aciklama: '',
    referans_toplamlari: {},
    satirlar: [],
    tahmin: [],
  },
  'personel.json': { santiye_sefleri: [], personel: [] },
};

for (const f of hedefDosyalar) {
  writeFileSync(join(destDir, f), JSON.stringify(sablon[f], null, 2) + '\n', 'utf8');
}

console.log(`OK: ${dest}/ icin yeni santiye sablonlari olusturuldu (slug=${slug}).`);
console.log('Doldurduktan sonra calistirin: node scripts/build-config.mjs && node scripts/validate-config.mjs');
console.log('Eski santiye verisini burada tutmak istiyorsaniz once yedekleyin.');
