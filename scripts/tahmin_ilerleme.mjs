import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

process.loadEnvFile();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !serviceRoleKey) {
  console.error('.env icinde VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY yok (RLS sonrasi anon yazamaz).');
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const durum = JSON.parse(
  readFileSync(join(__dirname, '..', 'data', 'durum_tespit.json'), 'utf8')
);

const adalar = durum.adalar;
const tarih = new Date().toISOString().slice(0, 10);
const raporlayan = 'DURUM TESPİT';
const aciklama = 'Tahmini — bağımlılık analizi';

function durumBul(yuzde) {
  if (yuzde >= 100) return 'tamamlandi';
  if (yuzde <= 0) return 'planlandi';
  return 'devam_ediyor';
}

const { data: raporlar, error: raporHata } = await sb
  .from('raporlar')
  .select('*');
if (raporHata) throw raporHata;

const refYuzde = new Map();
for (const r of raporlar) {
  const anahtar = `${r.ada}|${r.blok_no}|${r.is_kalemi}`;
  const onceki = refYuzde.get(anahtar);
  if (!onceki || new Date(r.olusturma_tarihi) > new Date(onceki.olusturma_tarihi)) {
    refYuzde.set(anahtar, r);
  }
}

const sonuclar = new Map();
const topluUpsert = [];

function adaOrtYuzde(ada, kalem) {
  const hesaplanan = sonuclar.get(`${ada}|${kalem}`);
  if (hesaplanan !== undefined) return hesaplanan;
  const r = refYuzde.get(`${ada}|0|${kalem}`);
  if (!r) return null;
  return r.durum === 'tamamlandi' ? 100 : r.ilerleme_yuzde;
}

function kaydet(ada, kalem, yuzde, kaynak) {
  if (!(yuzde > 0)) return;
  const y = Math.min(100, Math.max(0, Math.round(yuzde)));
  topluUpsert.push({
    id: `tahmin-${ada}|${kalem}`,
    tarih,
    raporlayan,
    ada,
    blok_no: 0,
    is_kalemi: kalem,
    durum: durumBul(y),
    ilerleme_yuzde: y,
    aciklama: kaynak ? `${aciklama} (${kaynak})` : aciklama,
  });
  sonuclar.set(`${ada}|${kalem}`, y);
}

async function upsertToplu() {
  const chunk = 500;
  let toplam = 0;
  for (let i = 0; i < topluUpsert.length; i += chunk) {
    const parca = topluUpsert.slice(i, i + chunk);
    const { error } = await sb.from('raporlar').upsert(parca, {
      onConflict: 'id',
    });
    if (error) throw error;
    toplam += parca.length;
  }
  return toplam;
}

let adet = 0;
for (const kural of durum.tahmin) {
  const kalem = kural.kalem;
  for (const ada of adalar) {
    let y = null;
    let kaynak = null;
    if (typeof kural.sabit === 'number') {
      y = kural.sabit;
      kaynak = 'sabit';
    } else if (Array.isArray(kural.min_kendi)) {
      const degerler = kural.min_kendi
        .map((k) => sonuclar.get(`${ada}|${k}`) ?? adaOrtYuzde(ada, k))
        .filter((v) => v !== null && v !== undefined);
      if (degerler.length > 0) {
        y = Math.min(...degerler);
        kaynak = 'min';
      }
    } else if (Array.isArray(kural.bagimliliklar)) {
      y = kural.bagimliliklar.reduce(
        (toplam, [k, agirlik]) =>
          toplam + (adaOrtYuzde(ada, k) ?? 0) * agirlik,
        0
      );
      kaynak = 'bağımlılık';
      if (typeof kural.ust_sinir === 'number' && y > kural.ust_sinir) {
        y = kural.ust_sinir;
      }
    }
    if (y !== null) {
      kaydet(ada, kalem, y, kaynak);
      adet++;
    }
  }
}

// Mekanik grubu: PDF'te %'siz ama miktarı olan kalemler (miktar / referans oranı)
const referans = durum.referans_toplamlari;
for (const s of durum.satirlar) {
  if (s[0] !== 'MEKANİK TESİSAT İŞLERİ') continue;
  for (let i = 0; i < adalar.length; i++) {
    const [, miktar] = s[3][i];
    if (miktar === null || miktar === undefined) continue;
    const ref = s[2] === 'BLOK' ? referans[adalar[i]].blok : referans[adalar[i]].kat;
    const y = ref > 0 ? Math.round(Math.min(100, (miktar / ref) * 100)) : 0;
    if (y > 0) {
      kaydet(adalar[i], s[1], y, 'miktar oranı');
      adet++;
    }
  }
}

const kaydedilen = await upsertToplu();
console.log(`Tahmin raporu: ${adet} hesaplandi, ${kaydedilen} kaydedildi`);
