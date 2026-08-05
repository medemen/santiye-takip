#!/usr/bin/env node
/**
 * data/santiye.config.json dogrular.
 * Kullanim: node scripts/validate-config.mjs [dosyaYolu]
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pathArg = process.argv[2] ?? join(__dirname, '..', 'data', 'santiye.config.json');

const DURUMLAR = ['planlandi', 'devam_ediyor', 'tamamlandi', 'gecikme'];

let cfg;
try {
  cfg = JSON.parse(readFileSync(pathArg, 'utf8'));
} catch (e) {
  console.error(`HATA: config okunamadi (${pathArg}): ${e.message}`);
  process.exit(1);
}

const hatalar = [];
const uyarilar = [];
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const str = (v) => typeof v === 'string' && v.trim().length > 0;
const arr = (v) => Array.isArray(v);

function hata(msg) {
  hatalar.push(msg);
}
function uyari(msg) {
  uyarilar.push(msg);
}

// --- genel ---
if (cfg.version !== 2) uyari('version 2 degil (beklenen 2, gelen: ' + cfg.version + ')');
for (const k of ['santiyeAdi', 'projeAdi', 'musteri']) {
  if (!str(cfg.genel?.[k])) hata('genel.' + k + ' eksik veya bos');
}

// --- marka ---
for (const k of ['appName', 'webBasename', 'emailDomain', 'localStoragePrefix', 'capacitorAppId']) {
  if (!str(cfg.marka?.[k])) hata('marka.' + k + ' eksik veya bos');
}

// --- roller ---
if (!arr(cfg.roller?.secilebilirRoller) || cfg.roller.secilebilirRoller.length === 0) {
  hata('roller.secilebilirRoller bos olmamali');
}

// --- yapi ---
if (!arr(cfg.yapi?.adalar) || cfg.yapi.adalar.length === 0) {
  hata('yapi.adalar bos olmamali');
}
const adaIsimleri = new Set();
let toplamBlok = 0;
for (const ada of cfg.yapi.adalar) {
  if (!str(ada.ada)) hata('yapi.adalar: ada ismi eksik');
  if (adaIsimleri.has(ada.ada)) hata('yapi.adalar: tekrar eden ada "' + ada.ada + '"');
  adaIsimleri.add(ada.ada);
  if (!arr(ada.bloklar) || ada.bloklar.length === 0) {
    hata('yapi.adalar: ' + ada.ada + ' blok listesi bos');
    continue;
  }
  const blokNolari = new Set();
  for (const b of ada.bloklar) {
    if (!num(b.blok_no)) hata(ada.ada + ': blok_no sayi olmali');
    else if (blokNolari.has(b.blok_no)) hata(ada.ada + ': tekrar eden blok_no ' + b.blok_no);
    else blokNolari.add(b.blok_no);
    if (!num(b.daire_sayisi) || b.daire_sayisi <= 0) hata(ada.ada + ' B' + b.blok_no + ': daire_sayisi pozitif olmali');
    if (!num(b.kat_sayisi) || b.kat_sayisi <= 0) hata(ada.ada + ' B' + b.blok_no + ': kat_sayisi pozitif olmali');
    if (!str(b.tip)) uyari(ada.ada + ' B' + b.blok_no + ': tip eksik');
  }
  toplamBlok += ada.bloklar.length;
  if (num(ada.blok_sayisi) && ada.blok_sayisi !== ada.bloklar.length) {
    hata(ada.ada + ': blok_sayisi (' + ada.blok_sayisi + ') bloklar ile uyusmuyor (' + ada.bloklar.length + ')');
  }
}

// --- isKalemleri ---
const grupIdleri = new Set();
const tumKalemler = new Map();
for (const g of cfg.isKalemleri?.gruplar ?? []) {
  if (!str(g.id)) hata('isKalemleri: grup id eksik');
  else if (grupIdleri.has(g.id)) hata('isKalemleri: tekrar eden grup id "' + g.id + '"');
  else grupIdleri.add(g.id);
  if (g.kaynak !== 'pdf' && g.kaynak !== 'yeni') hata(g.id + ': kaynak pdf/yeni olmali');
  if (!arr(g.kalemler) || g.kalemler.length === 0) hata(g.id + ': kalem listesi bos');
  for (const k of g.kalemler ?? []) {
    if (!str(k)) hata(g.id + ': bos kalem adi');
    else if (tumKalemler.has(k)) hata('tekrar eden kalem "' + k + '" (' + tumKalemler.get(k) + ' ve ' + g.id + ')');
    else tumKalemler.set(k, g.id);
  }
}

// --- sablonlar ---
for (const s of cfg.isKalemleri?.sablonlar ?? []) {
  if (!str(s.id)) hata('sablon: id eksik');
  if (!arr(s.grup_idleri) || s.grup_idleri.length === 0) hata(s.id + ': grup_idleri bos');
  for (const gid of s.grup_idleri ?? []) {
    if (!grupIdleri.has(gid)) hata(s.id + ': bilinmeyen grup id "' + gid + '"');
  }
  if (!DURUMLAR.includes(s.varsayilan_durum)) hata(s.id + ': gecersiz varsayilan_durum "' + s.varsayilan_durum + '"');
}

// --- durumTespit ---
const dt = cfg.durumTespit;
if (dt) {
  if (!arr(dt.satirlar)) hata('durumTespit.satirlar dizi olmali');
  const dtAdalar = dt.adalar ?? [];
  if (dtAdalar.length !== 0 && dtAdalar.length !== adaIsimleri.size) {
    hata('durumTespit.adalar boyutu yapi.adalar ile uyusmuyor');
  }
  for (const [g, k, birim, degerler] of dt.satirlar ?? []) {
    if (!str(g)) hata('durumTespit satiri: grup adi eksik');
    if (!str(k)) hata('durumTespit satiri: kalem adi eksik');
    else if (!tumKalemler.has(k)) uyari('durumTespit kalemi "' + k + '" isKalemleri listesinde yok');
    if (birim !== 'KAT' && birim !== 'BLOK' && birim !== '') hata('durumTespit "' + k + '": birim KAT/BLOK olmali');
    if (!arr(degerler) || degerler.length !== dtAdalar.length) {
      hata('durumTespit "' + k + '": degerler ada sayisi ile uyusmuyor');
    }
    const bosPlaceholder =
      birim === '' &&
      Array.isArray(degerler) &&
      degerler.every((d) => Array.isArray(d) && d[0] === null && d[1] === null);
    if (bosPlaceholder) uyari('durumTespit "' + k + '": bos placeholder satiri (birim bos, degerler null)');
    else if (birim !== 'KAT' && birim !== 'BLOK') hata('durumTespit "' + k + '": birim KAT/BLOK olmali');
  }
  for (const t of dt.tahmin ?? []) {
    if (!str(t.kalem)) hata('tahmin: kalem eksik');
    if (num(t.sabit) && (t.sabit < 0 || t.sabit > 100)) hata('tahmin "' + t.kalem + '": sabit 0-100 arasi olmali');
    if (arr(t.min_kendi) && t.min_kendi.length === 0) hata('tahmin "' + t.kalem + '": min_kendi bos');
    if (!num(t.sabit) && !arr(t.bagimliliklar) && !arr(t.min_kendi)) {
      hata('tahmin "' + t.kalem + '": sabit, bagimliliklar veya min_kendi olmali');
    }
    if (num(t.ust_sinir) && (t.ust_sinir < 0 || t.ust_sinir > 100)) hata('tahmin "' + t.kalem + '": ust_sinir 0-100 arasi olmali');
    for (const dep of t.bagimliliklar ?? []) {
      if (!arr(dep) || dep.length !== 2 || !str(dep[0]) || !num(dep[1])) {
        hata('tahmin "' + t.kalem + '": bagimliliklar [kalem, oran] formunda olmali');
      }
    }
  }
}

// --- ozet ---
console.log('Config: ' + pathArg);
console.log('  genel.santiyeAdi: ' + (cfg.genel?.santiyeAdi ?? '-' ));
console.log('  yapi: ' + adaIsimleri.size + ' ada, ' + toplamBlok + ' blok');
console.log('  isKalemleri: ' + grupIdleri.size + ' grup, ' + tumKalemler.size + ' kalem, ' + (cfg.isKalemleri?.sablonlar?.length ?? 0) + ' sablon');
console.log('  durumTespit: ' + (dt?.satirlar?.length ?? 0) + ' satir, ' + (dt?.tahmin?.length ?? 0) + ' tahmin kurali');

if (uyarilar.length) {
  console.log('\nUyarilar (' + uyarilar.length + '):');
  uyarilar.forEach((u) => console.log('  ! ' + u));
}
if (hatalar.length) {
  console.error('\nHatalar (' + hatalar.length + '):');
  hatalar.forEach((h) => console.error('  X ' + h));
  process.exit(1);
}
console.log('\nOK: config gecerli.');
