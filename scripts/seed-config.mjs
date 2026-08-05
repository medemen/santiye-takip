// Santiye config'ini Supabase `santiye_config` tablosuna yazar (id=1).
// Uygulama bundan cikmamistir; sadece admin paneli duzenlemeleri icin baslangic satiri olusturur.
// Kullanim: .env icinde SUPABASE_SERVICE_ROLE_KEY tanimlanmali.
//   npm run seed:config
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(
  readFileSync(join(__dirname, '..', 'data', 'santiye.config.json'), 'utf8')
);

const sb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error } = await sb.from('santiye_config').upsert(
  {
    id: 1,
    config: cfg,
    version: cfg.version,
    updated_at: new Date().toISOString(),
  },
  { onConflict: 'id' }
);
if (error) throw error;
console.log(`OK: config yazildi (${cfg.genel.santiyeAdi}, ${cfg.yapi.adalar.length} ada).`);
