// Saha yazismalarindan (santiye_takip_19 saha ic yazismalari) uretilen
// raporlari `raporlar` tablosuna aktarir. Service role anahtari gerekir.
//
//   npm run saha:aktar
//
// UYARI: Tum mevcut raporlari siler, `data/saha_raporlari.json` icerigiyle
// upsert eder. Demo/el ile girilmis tum rapor kayitlari kaybolur.
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

const sb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const raporlar = JSON.parse(
  readFileSync(join(__dirname, '..', 'data', 'saha_raporlari.json'), 'utf8')
);

const CHUNK = 300;

const { data: mevcut, error: okuHata } = await sb
  .from('raporlar')
  .select('id', { count: 'exact', head: true });
if (okuHata) throw okuHata;
console.log(`Mevcut rapor sayisi: ${mevcut?.length ?? '?'}`);

const { error: silHata } = await sb.from('raporlar').delete().gte('id', '');
if (silHata) throw silHata;
console.log('Mevcut raporlar silindi.');

let toplam = 0;
for (let i = 0; i < raporlar.length; i += CHUNK) {
  const parca = raporlar.slice(i, i + CHUNK);
  const { error } = await sb.from('raporlar').upsert(parca, { onConflict: 'id' });
  if (error) throw error;
  toplam += parca.length;
}
console.log(`Upsert edildi: ${toplam} rapor`);

const { count, error: sayHata } = await sb
  .from('raporlar')
  .select('id', { count: 'exact', head: true });
if (sayHata) throw sayHata;
console.log(`Tablo son durum: ${count} rapor`);