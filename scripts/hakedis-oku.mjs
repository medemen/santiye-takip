#!/usr/bin/env node
/**
 * Guneseyhir hakedis Excel dosyasindan pursantaj ve resmi ilerleme verilerini cikarir.
 *
 * Urettigi dosyalar:
 *   data/pursantaj.json          (ada x 26 hakedis grubu agirliklari)
 *   data/hakedis.json            (9. hakedis resmi ilerlemeleri: ILERLEME ICMALI + grup bazli)
 *   data/kalem_grup_eslesme.json (uygulama is kalemi -> hakedis grubu)
 *
 * Kaynak:  ILERLEME ICMALI + ADA1-6 INS/MEK/ELK YA. IS. LI. sayfalari
 * Kullanim: node scripts/hakedis-oku.mjs <xlsx-yolu>
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

const xlsxYolu = process.argv.slice(2).find((a) => a.toLowerCase().endsWith('.xlsx'));
if (!xlsxYolu) {
  console.error('Kullanim: node scripts/hakedis-oku.mjs <xlsx-yolu>');
  process.exit(1);
}
if (!existsSync(xlsxYolu)) {
  console.error('Dosya bulunamadi:', xlsxYolu);
  process.exit(1);
}

const wb = XLSX.read(readFileSync(xlsxYolu), { type: 'buffer' });

function yuzde(v) {
  if (v === undefined || v === null || v === '') return null;
  const s = String(v).replace(/\s+/g, '').replace('%', '').trim();
  if (s === '') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

const DIS_KOD = { 'İNŞAAT': 'İNŞ', 'MAKİNA TESİSATI': 'MEK', 'ELEKTRİK TESİSATI': 'ELK' };

function adaNormalize(ada) {
  return String(ada).replace(/\s+/g, '').replace(/^ADA/i, 'ADA-');
}

const GRUP_KATALOGU = [
  ['ins-kazi', 'İNŞ', 1, 'Kazı Dolgu Subasman Altı İmalatları'],
  ['ins-betonarme', 'İNŞ', 2, 'Betonarme Kalıp İskele Sistemi'],
  ['ins-doseme', 'İNŞ', 3, 'Döşeme İmalatları'],
  ['ins-duvar', 'İNŞ', 4, 'Duvar İmalatları'],
  ['ins-tavan', 'İNŞ', 5, 'Tavan İmalatları'],
  ['ins-pencere', 'İNŞ', 6, 'Pencere İmalatları'],
  ['ins-kapi', 'İNŞ', 7, 'Kapı, Ahşap İmalatları'],
  ['ins-dis-cephe', 'İNŞ', 8, 'Dış Cephe İmalatları'],
  ['ins-cati', 'İNŞ', 9, 'Çatı İmalatları'],
  ['ins-altyapi', 'İNŞ', 10, 'Altyapı İmalatları'],
  ['ins-merdiven', 'İNŞ', 11, 'Merdivenler,Giriş Holü ve Kat Holü'],
  ['ins-cevre', 'İNŞ', 12, 'Çevre Düzenleme ve İstinatlar'],
  ['ins-cocuk', 'İNŞ', 13, 'Çocuk Oyun Gurupları ve Çöp Kovaları'],
  ['mek-dogalgaz', 'MEK', 1, 'Doğalgaz Tesisatı'],
  ['mek-havalandirma', 'MEK', 2, 'Havalandırma Tesisatı'],
  ['mek-sihhi', 'MEK', 3, 'Sıhhi Tesisat'],
  ['mek-kalorifer', 'MEK', 4, 'Kalorifer Tesisatı'],
  ['mek-yangin', 'MEK', 5, 'Yangın Teisatı Tüm Adalar'],
  ['elk-linye', 'ELK', 1, 'Linye ve Sorti'],
  ['elk-diyafon', 'ELK', 2, 'Diyafon'],
  ['elk-topraklama', 'ELK', 3, 'Topraklama'],
  ['elk-cevre-ayd', 'ELK', 4, 'Çevre Aydınlatma'],
  ['elk-jenerator', 'ELK', 5, 'Jeneratör'],
  ['elk-solar', 'ELK', 6, 'Solar Enerji'],
  ['elk-kolon', 'ELK', 7, 'Kolon'],
  ['elk-pano', 'ELK', 8, 'Pano'],
  ['elk-asansor', 'ELK', 9, 'Asansör'],
];

function normalizeGrupAdi(ad) {
  return String(ad).toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
}
const GRUP_ADI_TO_ID = new Map();
for (const [id, , , ad] of GRUP_KATALOGU) {
  GRUP_ADI_TO_ID.set(normalizeGrupAdi(ad), id);
}

const GRUP_META = {};
for (const [id, dis, sira, ad] of GRUP_KATALOGU) {
  GRUP_META[id] = { ad, disiplin: dis, sira };
}

function grupIdBul(adi) {
  return GRUP_ADI_TO_ID.get(normalizeGrupAdi(adi)) ?? null;
}

function rowsOf(name) {
  const ws = wb.Sheets[name];
  if (!ws) return null;
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
}

// ---- 1) ILERLEME ICMALI ----
const ilerlemeSheet = Object.keys(wb.Sheets).find((n) => n.trim() === 'İLERLEME İCMALİ');
const ilerlemeRows = ilerlemeSheet ? rowsOf(ilerlemeSheet) : null;
const ilerlemeIcmal = { adalar: {}, toplam: null };
if (ilerlemeRows) {
  let guncelAda = null;
  for (const r of ilerlemeRows) {
    const sira = (r[0] ?? '').trim();
    const cins = (r[1] ?? '').trim();
    const disKod = DIS_KOD[cins];
    if (/^ADA/i.test(sira) && cins === 'İNŞAAT') {
      guncelAda = adaNormalize(sira);
      ilerlemeIcmal.adalar[guncelAda] = {};
    }
    if (disKod && guncelAda) {
      ilerlemeIcmal.adalar[guncelAda][disKod] = {
        imalat: yuzde(r[2]),
        adaBazli: yuzde(r[3]),
        hk9: yuzde(r[4]),
        kum: yuzde(r[5]),
        kumToplam: yuzde(r[6]),
      };
    } else if (sira === 'TOPLAM') {
      ilerlemeIcmal.toplam = { hk9: yuzde(r[4]), kum: yuzde(r[5]) };
    }
  }
}

// ---- 2) YA. IS. LI. sayfalari -> pursantaj + gerceklesen ----
const pursantajAdalar = {};
const hakedisGruplar = {};
for (const name of wb.SheetNames) {
  const m = name.match(/^ADA(\d+)\s+(İNŞ|MEK|ELK)\./i);
  if (!m) continue;
  const ada = `ADA-${m[1]}`;
  const dis = m[2];
  const rows = rowsOf(name);
  if (!rows) continue;
  const adaPur = (pursantajAdalar[ada] ??= { genel: 0, gruplar: {} });
  const adaHk = (hakedisGruplar[ada] ??= {});
  for (let i = 6; i < rows.length; i++) {
    const r = rows[i] || [];
    const no = (r[0] ?? '').trim();
    if (no === 'TOPLAM İMALATLAR') break;
    if (!/^\d+$/.test(no)) continue;
    const pur = yuzde(r[1]);
    if (pur === null) continue;
    const adi = (r[2] ?? '').trim();
    const id = grupIdBul(adi);
    if (!id) {
      console.warn(`UYARI: eşlenemeyen grup adı [${ada} ${dis}] -> "${adi}"`);
      continue;
    }
    adaPur.genel += pur;
    adaPur.gruplar[id] = pur;
    const gerceklesen = yuzde(r[4]);
    adaHk[id] = {
      pursantaj: pur,
      gerceklesen: gerceklesen ?? 0,
      imalat_yuzde: pur > 0 ? Math.min(100, ((gerceklesen ?? 0) / pur) * 100) : 0,
    };
  }
}

// ---- dogrulama: ada toplamlari ----
for (const ada of Object.keys(pursantajAdalar)) {
  const toplam = pursantajAdalar[ada].genel;
  console.log(`${ada}: pursantaj toplam %${toplam.toFixed(4)}`);
}
const genelToplam = Object.values(pursantajAdalar).reduce((s, a) => s + a.genel, 0);
console.log(`GENEL pursantaj toplam: %${genelToplam.toFixed(4)}`);

const pursantaj = {
  kaynak: xlsxYolu.split(/[\\/]/).pop(),
  hakedisNo: 9,
  toplam: genelToplam,
  gruplar: GRUP_META,
  adalar: pursantajAdalar,
};

const hakedis = {
  hakedisNo: 9,
  kaynak: xlsxYolu.split(/[\\/]/).pop(),
  ilerlemeIcmal,
  gruplar: hakedisGruplar,
};

writeFileSync(join(dataDir, 'pursantaj.json'), JSON.stringify(pursantaj, null, 2) + '\n', 'utf8');
writeFileSync(join(dataDir, 'hakedis.json'), JSON.stringify(hakedis, null, 2) + '\n', 'utf8');
console.log('OK: data/pursantaj.json, data/hakedis.json');
