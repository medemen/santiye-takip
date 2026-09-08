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

  // Ada pursantajlari %100 olacak sekilde normalize edilir. Her adanin
  // genel degeri kendi grup toplamina esitlenir, sonra tumu oransal
  // olceklenerek genel toplam 100.0000'e cekilir (kucuk yuvarlama
  // farklari hesaplari sistirmesin).
  const adalar = { ...pursantaj.adalar };
  let toplam = 0;
  for (const [ada, v] of Object.entries(adalar)) {
    const grupTop = Object.values(v.gruplar ?? {}).reduce((s, g) => s + g, 0);
    v.genel = grupTop;
    toplam += grupTop;
  }
  if (Math.abs(toplam - 100) > 1e-9 && toplam > 0) {
    const faktor = 100 / toplam;
    for (const v of Object.values(adalar)) {
      v.genel *= faktor;
      for (const g of Object.keys(v.gruplar)) v.gruplar[g] *= faktor;
    }
    console.log(`UYARI: pursantaj toplami %${toplam.toFixed(4)} -> %100.0000 olarak normalize edildi (x${faktor.toFixed(6)})`);
  }

  hakedis = {
    hakedisNo: pursantaj.hakedisNo,
    kaynak: pursantaj.kaynak,
    gruplar: pursantaj.gruplar,
    adalar,
    toplam: 100,
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

const raporSablonu = {
  baslikOnEkleri: basics.raporSablonu?.baslikOnEkleri ?? {},
  aciklamaZorunluKalemler: basics.raporSablonu?.aciklamaZorunluKalemler ?? [],
  varsayilanAciklama: basics.raporSablonu?.varsayilanAciklama ?? '',
};

const config = {
  version: 2,
  genel: basics.genel,
  marka: basics.marka,
  roller: basics.roller,
  yapi: { adalar },
  isKalemleri: basics.isKalemleri,
  raporSablonu,
  durumTespit,
  ...(hakedis ? { hakedis } : {}),
};

const outPath = join(dataDir, 'santiye.config.json');
writeFileSync(outPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
console.log(`OK: ${outPath} (${adalar.length} ada, ${adalar.reduce((n, a) => n + a.bloklar.length, 0)} blok, ${config.isKalemleri.gruplar.length} grup, ${durumTespit.satirlar.length} durum tespit satiri)`);
