// Realtime + reload senkron testi (iki ayri tarayici oturumu).
// Setup: A ve B rapor yuklemesi tamamen tamamlanana kadar bekletilir.
// Faz 1 (REALTIME): A bir rapor ekler -> B 1sn icinde gorur mu?
// Faz 2 (RELOAD): B reload -> 15sn bekle -> gelir mi?
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = resolve(dirname(fileURLToPath(import.meta.url)), '..');
try { process.loadEnvFile(resolve(KOK, '.env')); } catch {}

const config = JSON.parse(readFileSync(resolve(KOK, 'data/santiye.config.json'), 'utf8'));
const STORAGE_KEY = `${config.marka.localStoragePrefix}_raporlar`;

const BASE = process.env.TEST_BASE || 'http://localhost:5173/';
const USER = 'Mehmet Orhan Edemen';
const SIFRE = process.env.VITE_DEFAULT_PASSWORD;
const KALEM = 'Hafriyat';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctxA = await browser.newContext({ viewport: { width: 480, height: 900 }, locale: 'tr-TR' });
const ctxB = await browser.newContext({ viewport: { width: 480, height: 900 }, locale: 'tr-TR' });
const pageA = await ctxA.newPage();
const pageB = await ctxB.newPage();

for (const [ad, p] of [['A', pageA], ['B', pageB]]) {
  p.on('console', (m) => { if (m.type() === 'error') console.log(`  [console-err ${ad}]`, m.text().slice(0, 300)); });
  p.on('pageerror', (e) => console.log(`  [pageerr ${ad}]`, String(e).slice(0, 300)));
}

async function giris(p) {
  await p.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await p.locator('select').first().waitFor({ state: 'visible', timeout: 30000 });
  const secenekleri = await p.locator('select option').allTextContents();
  const secenek = secenekleri.find((s) => s.includes(USER));
  if (!secenek) throw new Error('Kullanici yok: ' + USER);
  await p.locator('select').first().selectOption({ label: secenek });
  const sifre = p.locator('input[type="password"]');
  if (await sifre.count() > 0) await sifre.first().fill(SIFRE);
  await p.getByRole('button', { name: 'Giriş Yap' }).click();
  await p.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 60000 });
  await p.waitForTimeout(1500);
}

const raporSayisi = (p) => p.evaluate((key) => {
  try { const raw = localStorage.getItem(key); if (!raw) return 0; const d = JSON.parse(raw); return Array.isArray(d) ? d.length : 0; } catch { return -1; }
}, STORAGE_KEY);

// rapor sayisi sabit bir degerde durana kadar bekle (ilk yukleme tamamlansin)
async function yuklemeTamamlansin(p, min, label) {
  for (let i = 0; i < 20; i++) {
    const n = await raporSayisi(p);
    if (n >= min) { console.log(`  [${label}] rapor sayisi sabit:`, n); return n; }
    await p.waitForTimeout(1500);
  }
  const n = await raporSayisi(p);
  console.log(`  [${label}] zaman asimi, rapor sayisi:`, n);
  return n;
}

console.log('Giris A...');
await giris(pageA);
console.log('Giris B...');
await giris(pageB);

const minA = Math.max(1000, (await raporSayisi(pageA)));
let sayiA = await yuklemeTamamlansin(pageA, minA, 'A');
let sayiB = await yuklemeTamamlansin(pageB, Math.max(1000, sayiA), 'B-setup');
console.log('SETUP OK; A:', sayiA, 'B:', sayiB);

// ---- FAZ 1: REALTIME ----
await pageA.evaluate(() => { window.history.pushState({}, '', '/rapor-ekle?ada=ADA-1'); window.dispatchEvent(new PopStateEvent('popstate')); });
await pageA.waitForTimeout(1500);
const adaBtn = pageA.locator('button[data-ada="ADA-1"]');
if (await adaBtn.count() > 0) await adaBtn.first().click();
const arama = pageA.locator('input[placeholder="İş kalemi ara..."]');
await arama.waitFor({ state: 'visible', timeout: 10000 });
await arama.fill(KALEM);
await pageA.getByRole('button', { name: KALEM, exact: true }).click();
await pageA.waitForTimeout(600);
const blok = pageA.locator('button').filter({ hasText: /^1$/ }).first();
if (await blok.count() > 0) await blok.click();
await pageA.locator('textarea').fill('REALTIME-FAZ1-' + Date.now());
await pageA.getByRole('button', { name: /Rapor Kaydet/ }).click();
await pageA.waitForTimeout(800);
sayiA = await raporSayisi(pageA);
console.log('A rapor ekledi -> A:', sayiA, ', beklenen yeni sayi:', sayiB + 1);

// B'yi 1sn icinde olc (realtime penceresi)
await pageB.waitForTimeout(1500);
const sayiBRealtime = await raporSayisi(pageB);
console.log('FAZ1 (realtime) B:', sayiBRealtime, sayiBRealtime > sayiB ? '=> REALTIME OK' : '=> REALTIME GELMEDI');

// ---- FAZ 2: RELOAD ----
await pageB.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
await pageB.waitForTimeout(15000);
const sayiBReload = await raporSayisi(pageB);
console.log('FAZ2 (reload+15sn) B:', sayiBReload, sayiBReload > sayiB ? '=> RELOAD SENKRON OK' : '=> RELOAD DA GELMEDI');

await browser.close();
process.exit(0);