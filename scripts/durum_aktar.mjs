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
const aciklama = 'DURUM TESPİT RAPORU 26/07/29 aktarımı';

const yeniKalemler = new Set(durum.satirlar.map((s) => s[1]));
for (const t of durum.tahmin) yeniKalemler.add(t.kalem);
console.log(`Yeni kalem listesi: ${yeniKalemler.size}`);

function durumBul(yuzde) {
  if (yuzde >= 100) return 'tamamlandi';
  if (yuzde <= 0) return 'planlandi';
  return 'devam_ediyor';
}

async function eskiRaporlariSil() {
  const { data, error } = await sb.from('raporlar').select('is_kalemi');
  if (error) throw error;
  const eskiSet = [...new Set(data.map((r) => r.is_kalemi))].filter(
    (k) => !yeniKalemler.has(k)
  );
  if (eskiSet.length === 0) {
    console.log('Silinecek eski kalem yok.');
    return 0;
  }
  const { count, error: delError } = await sb
    .from('raporlar')
    .delete({ count: 'exact' })
    .in('is_kalemi', eskiSet);
  if (delError) throw delError;
  console.log(`Silindi: ${count ?? '?'} eski rapor (${eskiSet.length} kalem: ${eskiSet.join(', ')})`);
  return count ?? 0;
}

function satirSatirlariUret() {
  const rows = [];
  for (const s of durum.satirlar) {
    for (let i = 0; i < adalar.length; i++) {
      const [yuzde] = s[3][i];
      if (yuzde === null || yuzde === undefined) continue;
      const y = Math.min(100, Math.max(0, Math.round(yuzde)));
      rows.push({
        id: `dt-${adalar[i]}|${s[1]}`,
        tarih,
        raporlayan,
        ada: adalar[i],
        blok_no: 0,
        is_kalemi: s[1],
        durum: durumBul(y),
        ilerleme_yuzde: y,
        aciklama,
      });
    }
  }
  return rows;
}

async function aktarimYap(rows) {
  const chunk = 500;
  let toplam = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const parca = rows.slice(i, i + chunk);
    const { error } = await sb.from('raporlar').upsert(parca, {
      onConflict: 'id',
    });
    if (error) throw error;
    toplam += parca.length;
  }
  console.log(`Aktarildi (upsert): ${toplam} satir`);
  return toplam;
}

const silinen = await eskiRaporlariSil();
const rows = satirSatirlariUret();
const aktarilan = await aktarimYap(rows);

const { count: sonDurum, error: sonHata } = await sb
  .from('raporlar')
  .select('id', { count: 'exact', head: true });
if (sonHata) throw sonHata;
console.log(`Sonuc: ${sonDurum} rapor (silinen: ${silinen}, aktarilan: ${aktarilan})`);
