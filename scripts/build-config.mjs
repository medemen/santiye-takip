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
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

const basics = JSON.parse(readFileSync(join(dataDir, 'config-basics.json'), 'utf8'));
const yapiSrc = JSON.parse(readFileSync(join(dataDir, 'adalar_bloklar.json'), 'utf8'));
const durumSrc = JSON.parse(readFileSync(join(dataDir, 'durum_tespit.json'), 'utf8'));

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
};

const outPath = join(dataDir, 'santiye.config.json');
writeFileSync(outPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
console.log(`OK: ${outPath} (${adalar.length} ada, ${adalar.reduce((n, a) => n + a.bloklar.length, 0)} blok, ${config.isKalemleri.gruplar.length} grup, ${durumTespit.satirlar.length} durum tespit satiri)`);
