#!/usr/bin/env node
/**
 * Resmi hakedis ilerlemesini raporlara aktarir.
 *
 * Her ada x disiplin (INS/MEK/ELK) icin ILERLEME ICMALI'ndaki "KUMULATIF
 * ILERLEME" degerini, blok_no=0 (ada geneli) rapor olarak yazar. Kalem adi
 * uygulama kalemleriyle birebir eslesmedigi icin raporlayan="HAKEDIS" etiketi
 * ile, durumTespit'in tersine bu raporlar dashboard agirlikli hesaba
 * katilmayacak sekilde ayri tutulur (bkz. raporYuzde/uygulama hesaplari).
 *
 * UYARI: Yalnizca "HK-<ada>|0|" on ekli raporlar bu script'e aittir; tekrar
 * calistirmak bu raporlari upsert ile gunceller.
 *
 * Kullanim: node scripts/hakedis-aktar.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const kok = join(__dirname, '..');
if (existsSync(join(kok, '.env'))) process.loadEnvFile(join(kok, '.env'));
if (existsSync(join(kok, '.env.production'))) process.loadEnvFile(join(kok, '.env.production'));

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !serviceRoleKey) {
  console.error('.env icinde VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY yok.');
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const config = JSON.parse(
  readFileSync(join(__dirname, '..', 'data', 'santiye.config.json'), 'utf8')
);
const hk = config.hakedis;
if (!hk) {
  console.error('config.hakedis yok; once npm run build:config calistirin.');
  process.exit(1);
}

const ilerleme = hk.ilerlemeIcmal;
const adalar = Object.keys(ilerleme.adalar);
const tarih = new Date().toISOString().slice(0, 10);
const raporlayan = 'HAKEDİŞ';
const aciklama = `${hk.hakedisNo}. hakedis resmi kumulatif ilerleme aktarimi`;

const DIS_KODU = { 'İNŞ': 'İNŞAAT', 'MEK': 'MEKANİK', 'ELK': 'ELEKTRİK' };

function durumBul(yuzde) {
  if (yuzde >= 100) return 'tamamlandi';
  if (yuzde <= 0) return 'planlandi';
  return 'devam_ediyor';
}

async function eskiAktarimlariSil() {
  const { data, error } = await sb
    .from('raporlar')
    .select('id')
    .eq('raporlayan', raporlayan)
    .like('id', 'HK-%');
  if (error) throw error;
  if (!data || data.length === 0) {
    console.log('Silinecek eski hakedis raporu yok.');
    return 0;
  }
  const ids = data.map((r) => r.id);
  const { count, error: delError } = await sb
    .from('raporlar')
    .delete({ count: 'exact' })
    .in('id', ids);
  if (delError) throw delError;
  console.log(`Silindi: ${count ?? '?'} eski hakedis raporu`);
  return count ?? 0;
}

function satirlariUret() {
  const rows = [];
  for (const ada of adalar) {
    const disiplinler = ilerleme.adalar[ada];
    for (const [dis, disKod] of Object.entries(DIS_KODU)) {
      const d = disiplinler[dis];
      if (!d || d.kum === null || d.kum === undefined) continue;
      const y = Math.min(100, Math.max(0, Math.round(d.kum)));
      rows.push({
        id: `HK-${ada}|0|${disKod}`,
        tarih,
        raporlayan,
        ada,
        blok_no: 0,
        is_kalemi: disKod,
        durum: durumBul(y),
        ilerleme_yuzde: y,
        aciklama,
      });
    }
  }
  return rows;
}

const silinen = await eskiAktarimlariSil();
const rows = satirlariUret();
const chunk = 500;
let toplam = 0;
for (let i = 0; i < rows.length; i += chunk) {
  const parca = rows.slice(i, i + chunk);
  const { error } = await sb.from('raporlar').upsert(parca, { onConflict: 'id' });
  if (error) throw error;
  toplam += parca.length;
}
console.log(`Aktarildi (upsert): ${toplam} satir (${adalar.length} ada x 3 disiplin)`);

for (const ada of adalar) {
  const d = ilerleme.adalar[ada];
  console.log(
    `  ${ada}: INS %${d.İNŞ.kum}, MEK %${d.MEK?.kum ?? '-'}, ELK %${d.ELK?.kum ?? '-'}`
  );
}
console.log(`Sonuc: ${rows.length} satir (silinen: ${silinen}, kumulatif toplam %${ilerleme.toplam.kum})`);
