import { createClient } from '@supabase/supabase-js';

process.loadEnvFile();
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const say = async (filtre, deger) => {
  let q = sb.from('raporlar').select('id', { count: 'exact', head: true });
  if (filtre) q = q[filtre](...deger);
  const { count } = await q;
  return count;
};

console.log('TOP', await say(null, null));
console.log('NULL_KALEM', await say('is', ['is_kalemi', null]));
console.log('ADALAR', ...(await Promise.all(['ADA-1','ADA-2','ADA-3','ADA-4','ADA-5','ADA-6'].map((a) => say('eq', ['ada', a]).then((c) => `${a}=${c}`)))));
console.log('BLOK_0', await say('eq', ['blok_no', 0]));
console.log('DURUM', ...(await Promise.all(['onaylandi','devam_ediyor','tamamlandi','gecikme'].map((d) => say('eq', ['durum', d]).then((c) => `${d}=${c}`)))));
console.log('ONAY_BEKLEMEDE', await say('eq', ['onay_durumu', 'beklemede']));

const { data: ornek } = await sb.from('raporlar').select('id,tarih,raporlayan,ada,blok_no,is_kalemi,ilerleme_yuzde,durum,aciklama').eq('ada','ADA-1').eq('blok_no',7).limit(8);
for (const r of ornek) console.log(`${r.ada} blok${r.blok_no} | ${r.is_kalemi} | %${r.ilerleme_yuzde} [${r.durum}] | ${r.tarih} | ${r.raporlayan} | ${(r.aciklama||'').slice(0,55)}`);