import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

process.loadEnvFile();

const APPLY = process.argv.includes('--apply');
const EXCEL_PATH = 'C:\\Users\\medem\\Desktop\\YZ\\ada_ilerleme_oranlari.xlsx';

// --- App iş kalemi sözlüğü (config'den; yazım hatası olmasın diye) ---
const cfg = JSON.parse(readFileSync('data/santiye.config.json', 'utf8'));
const grupById = {};
for (const g of cfg.isKalemleri.gruplar) grupById[g.id] = g.kalemler;
const allKalem = new Set(cfg.isKalemleri.gruplar.flatMap((g) => g.kalemler));
const resolve = (v) => (typeof v === 'string' ? grupById[v] || [] : v);

// Excel "İş Kalemi" -> uygulama kalem listesi (grup id veya açık kalem adları)
const ITEM_TO_KALEMLER = {
  'Altyapı İmalatları': 'altyapi',
  Asansör: 'asansor',
  'Betonarme Kalıp İskele Sistemi': ['Betonarme Kalıp', 'Betonarme Demir', 'Beton Dökümü', 'Asmolen Döşeme', 'Perde Duvar'],
  Diyafon: ['İnterkom'],
  'Doğalgaz Tesisatı': ['DOĞALGAZ İÇ TESİSAT'],
  'Duvar İmalatları': 'duvar-yalitim',
  'Döşeme İmalatları': 'doseme',
  'Dış Cephe İmalatları': ['DIŞ CEPHE İSKELE', 'Kaba Sıva', 'Taşyünü Kaplama', 'Isı Yalıtım Sıvası', 'Mantolama Sıvası', 'Cephe Boya', 'Gırgır cephesi sıva', 'Gırgır cephesi grenli boya'],
  'Havalandırma Tesisatı': ['Aspiratör'],
  Jeneratör: ['Aydınlatma Armatür Montajı'],
  'Kalorifer Tesisatı': ['Radyatör ve Havlupan Montajı'],
  'Kapı, Ahşap İmalatları': ['PVC Kapı', 'Çelik Kapı (Pervaz-kasa-kanat)', 'Yangın Kapıları', 'Bodrum kapıları', 'İç Oda Kapı Kasası', 'İç Oda Kapı Kanadı', 'İç Oda Kapı Pervazı', 'Vestiyer ve çamaşır dolabı', 'Mutfak Dolabı ve hilton', 'Mutfak Dolap Kapakları', 'Korniş', 'Posta kutusu', 'Bodrum mutfak nişi'],
  'Kazı Dolgu Subasman Altı İmalatları': ['Hafriyat', 'Subasman'],
  Kolon: ['Betonarme Demir', 'Beton Dökümü'],
  'Linye ve Sorti': ['Daire içi kablolama', 'Desant', 'Sigorta Kutusu (Daire İçi)'],
  'Merdivenler,Giriş Holü ve Kat Holü': ['Kat Holü Alçı', 'Merdiven alçı', 'Merdiven altı sıvası'],
  Pano: ['Kablo Tavası', 'Merdiven Tavalar (Şaft İçi)', 'Kuvvetli Akım Kolon Kabloları', 'Zayıf Akım Kolon Kabloları'],
  'Pencere İmalatları': ['PVC Pencere', 'PVC Cam', 'Alüminyum panjur pencere'],
  'Solar Enerji': ['Anahtar Priz Montajı'],
  'Sıhhi Tesisat': ['Pis su kolon (wc+mutfak+balkon)', 'Pis su daire alt toplama tesisatı', 'Pis su bodrum toplama tesisatı', 'Pis su rögar bağlantısı', 'Pis su yağmur ve balkon inişi', 'Yağmur suyu rögar bağlantısı', 'Hela taşı + Süzgeç Montajları', 'Temiz su Ppr-c (Daire)', 'Temiz su Ppr-c (Bodrum)', 'Galveniz kolon tesisatı', 'Galveniz anahat (Hidrofor Odası)', 'Daire içi pex tesisatı', 'Daire içi Kollektör Montajı', 'Su sayaçları montajı', 'Vitrifiye Montajı', 'Armatür Montajı'],
  'Tavan İmalatları': ['Tavan Boyası'],
  Topraklama: ['Temel Topraklama'],
  'Yangın Teisatı Tüm Adalar': 'yangin-guvenligi',
  'Çatı İmalatları': ['ÇATI AHŞAP', 'ÇATI KİREMİT'],
  'Çevre Aydınlatma': ['Aydınlatma Direkleri'],
  'Çevre Düzenleme ve İstinatlar': ['Çimlendirme & Ağaçlandırma', 'Otomatik Sulama', 'Yaya Yolu', 'Çevre Çiti', 'Otopark'],
  'Çocuk Oyun Gurupları ve Çöp Kovaları': ['Kent Mobilyaları', 'Oyun Alanı'],
};

const normAda = (a) => a.replace(/^ADA\s*(\d+)$/i, (_, n) => 'ADA-' + n).trim();
const toPct = (v) => {
  if (v == null) return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  const raw = n > 1 ? Math.round(n) : Math.round(n * 100);
  return Math.max(0, Math.min(100, raw));
};
const durum = (p) => (p >= 100 ? 'tamamlandi' : p <= 0 ? 'planlandi' : 'devam_ediyor');

// --- Excel oku ---
const wb = XLSX.read(readFileSync(EXCEL_PATH), { type: 'buffer' });
const aoa = XLSX.utils.sheet_to_json(wb.Sheets['KALEM DETAYI'], { header: 1, defval: null });
let hi = -1;
for (let i = 0; i < aoa.length; i++) {
  const r = aoa[i] || [];
  if (String(r[0]).trim() === 'Ada' && r.some((c) => String(c).trim() === 'İş Kalemi')) { hi = i; break; }
}
const header = aoa[hi].map((c) => String(c).trim());
const colKalem = header.indexOf('İş Kalemi');
const colTam = header.indexOf('Tamamlanma %');
const excelRows = [];
for (let i = hi + 1; i < aoa.length; i++) {
  const r = aoa[i] || [];
  const ada = r[0];
  const item = r[colKalem];
  if (!ada || !item || String(item).trim() === 'İş Kalemi') continue;
  if (!(String(item).trim() in ITEM_TO_KALEMLER)) continue; // TOPLAM satırları ve eşleşmeyenler atlanır
  excelRows.push({ ada: normAda(String(ada).trim()), item: String(item).trim(), pct: toPct(r[colTam]) });
}

// --- Supabase ---
const url = process.env.SUPABASE_TARGET_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('EKSİK: .env icinde VITE_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanimli olmali.');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

// İlk sahiplenme kazanır: bir app kalemi birden fazla Excel satırına eşlenirse,
// sözlük sırasında önce gelen (burada Betonarme Kalıp İskele Sistemi) sahip olur,
// sonraki (Kolon) o kalemleri atlar.
const owned = new Set();
let prevAda = null;
let guncellenecek = 0;
let atlandi = 0;
for (const ex of excelRows) {
  if (ex.ada !== prevAda) { owned.clear(); prevAda = ex.ada; }
  const kalemler = resolve(ITEM_TO_KALEMLER[ex.item]).filter((k) => allKalem.has(k) && !owned.has(k));
  for (const k of kalemler) owned.add(k);
  if (kalemler.length === 0) { console.log('  [UYARI] ' + ex.item + ' icin gecerli kalem yok (baskalari tarafindan sahiplenildi), atlandi.'); continue; }
  const { data, error } = await sb
    .from('raporlar')
    .select('id, blok_no, is_kalemi, olusturma_tarihi')
    .eq('ada', ex.ada)
    .in('is_kalemi', kalemler)
    .limit(5000);
  if (error) { console.error('  SB HATA (' + ex.item + '): ' + error.message); continue; }
  if (!data || data.length === 0) {
    console.log('  [ATLA] ' + ex.ada + ' / ' + ex.item + ' -> eslesen rapor yok (' + ex.pct + '%)');
    atlandi++;
    continue;
  }
  const latest = new Map();
  for (const r of data) {
    const k = r.blok_no + '|' + r.is_kalemi;
    const mevcut = latest.get(k);
    if (!mevcut || new Date(r.olusturma_tarihi).getTime() > new Date(mevcut.olusturma_tarihi).getTime()) latest.set(k, r);
  }
  const yeniDurum = durum(ex.pct);
  console.log('  ' + ex.ada + ' / ' + ex.item + ' -> ' + ex.pct + '% (' + yeniDurum + '), ' + latest.size + ' rapor guncellenecek (' + data.length + ' adaydan)');
  if (APPLY) {
    for (const r of latest.values()) {
      const { error: ue } = await sb.from('raporlar').update({ ilerleme_yuzde: ex.pct, durum: yeniDurum }).eq('id', r.id);
      if (ue) console.error('    guncelleme hatasi ' + r.id + ': ' + ue.message);
      else guncellenecek++;
    }
  } else {
    guncellenecek += latest.size;
  }
}
console.log('\nOZET: ' + (APPLY ? 'UYGULANDI' : 'KURU CALISTI (yazma yok)') + ' | guncellenecek/guncellenen: ' + guncellenecek + ' | eslesme yok: ' + atlandi);
console.log(APPLY ? 'Gercek guncelleme tamamlandi.' : 'Gercekten uygulamak icin: node scripts/apply-excel-ilerleme.mjs --apply');
