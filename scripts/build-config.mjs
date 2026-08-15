#!/usr/bin/env node
/**
 * data/santiye.config.json oluşturur.
 * Kaynaklar:
 *   - data/config-basics.json  (genel, marka, roller, isKalemleri)
 *   - data/adalar_bloklar.json (yapi)
 *   - data/durum_tespit.json   (durumTespit)
 *
 * Kullanım: node scripts/build-config.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

const basics = JSON.parse(readFileSync(join(dataDir, 'config-basics.json'), 'utf8'));
const yapiSrc = JSON.parse(readFileSync(join(dataDir, 'adalar_bloklar.json'), 'utf8'));
const durumSrc = JSON.parse(readFileSync(join(dataDir, 'durum_tespit.json'), 'utf8'));

// Hakediş verileri (yoksa config'e dahil edilmez)
let hakedis = null;
const hakedisKaynaklariVar = ['pursantaj.json', 'hakedis.json', 'kalem_grup_eslesme.json'].every((src) =>
  existsSync(join(dataDir, src))
);
if (hakedisKaynaklariVar) {
  const pursantaj = JSON.parse(readFileSync(join(dataDir, 'pursantaj.json'), 'utf8'));
  const hakedisJson = JSON.parse(readFileSync(join(dataDir, 'hakedis.json'), 'utf8'));
  const eslesme = JSON.parse(readFileSync(join(dataDir, 'kalem_grup_eslesme.json'), 'utf8'));
  hakedis = {
    hakedisNo: pursantaj.hakedisNo,
    kaynak: pursantaj.kaynak,
    gruplar: pursantaj.gruplar,
    adalar: pursantaj.adalar,
    toplam: pursantaj.toplam,
    ilerlemeIcmal: hakedisJson.ilerlemeIcmal,
    grupIlerleme: hakedisJson.gruplar,
    kalemEslesme: eslesme.eslesme,
  };
}

const adalar = yapiSrc.adalar.map((a) => ({
  ada: a.ada,
  blok_sayisi: a.blok_sayisi,
  toplam_daire: a.toplam_daire,
  toplam_kat: a.toplam_kat,
  bloklar: a.bloklar,
}));

const durumTespit = {
  aciklama: durumSrc.aciklama,
  adalar: adalar.map((a) => a.ada),
  referans_toplamlari: durumSrc.referans_toplamlari,
  satirlar: durumSrc.satirlar,
  tahmin: durumSrc.tahmin ?? [],
};

const config = {
  version: 2,
  genel: basics.genel,
  marka: basics.marka,
  roller: basics.roller,
  yapi: { adalar },
  isKalemleri: basics.isKalemleri,
  durumTespit,
  ...(hakedis ? { hakedis } : {}),
};

const outPath = join(dataDir, 'santiye.config.json');
writeFileSync(outPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
console.log(`OK: ${outPath} (${adalar.length} ada, ${adalar.reduce((n, a) => n + a.bloklar.length, 0)} blok, ${config.isKalemleri.gruplar.length} grup, ${durumTespit.satirlar.length} durum tespit satiri)`);
