// Realtime protokol testi: uygulamanın kullandığı supabase-js ile
// 'raporlar' tablosuna postgres_changes abone olur, ardından service role
// REST ile yeni bir satır ekler ve olayın gerçekten gelip gelmediğini ölçer.
import { createClient } from '@supabase/supabase-js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = resolve(dirname(fileURLToPath(import.meta.url)), '..');
try { process.loadEnvFile(resolve(KOK, '.env')); } catch {}

const URL = process.env.VITE_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;
const SRV = process.env.SUPABASE_SERVICE_ROLE_KEY;

const eposta = 'mehmet.orhan.edemen@' + (process.env.VITE_EMAIL_DOMAIN || 'santiye.com');
const sifre = process.env.VITE_DEFAULT_PASSWORD;

const istemci = createClient(URL, ANON);
const testId = 'realtime-protokol-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

console.log('Oturum açılıyor:', eposta);
const { data, error } = await istemci.auth.signInWithPassword({ email: eposta, password: sifre });
if (error) { console.error('LOGIN HATASI:', error.message); process.exit(1); }
console.log('Oturum açıldı (user_id):', data.user.id);

let olayGeldi = false;
const channel = istemci
  .channel('protokol-test')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'raporlar' },
    (payload) => {
      if (payload.new?.id === testId) {
        olayGeldi = true;
        console.log('REALTIME OLAY GELDİ, id:', payload.new.id);
      }
    })
  .subscribe((status) => {
    console.log('channel status:', status);
    if (status === 'SUBSCRIBED') {
      console.log('Abone olundu, INSERT deniyor...');
      setTimeout(async () => {
        const srv = createClient(URL, ANON, { global: { headers: { apikey: SRV, Authorization: 'Bearer ' + SRV } } });
        const { error: insErr } = await srv.from('raporlar').insert({
          id: testId,
          tarih: '2026-09-01',
          raporlayan: 'REALTIME PROTOKOL',
          ada: 'ADA-1',
          blok_no: 1,
          is_kalemi: 'Hafriyat',
          durum: 'devam_ediyor',
          ilerleme_yuzde: 5,
          aciklama: 'realtime protokol testi',
          olusturma_tarihi: new Date().toISOString(),
          onay_durumu: 'beklemede',
          revizyon_notu: '',
          fotograflar: [],
          user_id: null,
        }, { onConflict: 'id' });
        if (insErr) console.error('INSERT HATASI:', insErr.message);
        else console.log('INSERT gönderildi (service role)');
      }, 1500);
    }
  });

setTimeout(async () => {
  if (!olayGeldi) console.log('SONUÇ: REALTIME OLAY 8sn İÇİNDE GELMEDİ');
  else console.log('SONUÇ: REALTIME ÇALIŞIYOR');
  await istemci.removeChannel(channel);
  // temizlik
  await istemci.from('raporlar').delete().eq('id', testId);
  process.exit(0);
}, 8000);