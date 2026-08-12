// Tarayici smoke testi (playwright-core + sistemde kurulu Chrome).
//   npm run test:browser
// Opsiyonel bayraklar:
//   --user "Ad Soyad"   giris yapilacak kullanici (varsayilan: Mehmet Orhan Edemen)
//   --pm               Proje Muduru olarak /ayarlar ve /yeni-santiye akislarini da test eder
//   --auto-start       dev server kapaliysa otomatik baslatir
//   --base <url>       farkli adres (varsayilan http://localhost:5173/)
//   --headed           tarayiciyi gorunur acar
// Cikis kodu: tum adimlar gecerse 0, aksi halde 1.

import { chromium } from 'playwright-core';
import { execSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function arg(ad, varsayilan) {
  const i = process.argv.indexOf(ad);
  return i >= 0 ? (process.argv[i + 1] ?? varsayilan) : varsayilan;
}
function flag(ad) {
  return process.argv.includes(ad);
}

const USER = arg('--user', 'Mehmet Orhan Edemen');
const PM = flag('--pm');
const OTO_BASLAT = flag('--auto-start');
const HEADED = flag('--headed');
const BASE = arg('--base', 'http://localhost:5173/').replace(/\/+$/, '') + '/';

const cfg = JSON.parse(readFileSync(resolve(KOK, 'data/santiye.config.json'), 'utf8'));
const SANTIYE_ADI = cfg.genel.santiyeAdi;
const ADALAR = cfg.yapi.adalar ?? [];
const ILK_ADA = ADALAR[0]?.ada;
const ILK_BLOK = ADALAR[0]?.bloklar?.[0]?.blok_no;
const KALEM = (cfg.isKalemleri.gruplar?.[0]?.kalemler?.[0]) ?? 'Hafriyat';

const sonuclar = [];
const konsolHatalari = [];
const sayfaHatalari = [];
const istekHatalari = [];

function devServerAyakta() {
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8', windowsHide: true });
    return /TCP\s+\S+:5173\s+\S+:0\s+LISTENING/.test(out);
  } catch {
    return false;
  }
}

function devServeriBaslat() {
  console.log('[tester] Dev server baslatiliyor...');
  execSync(`node "${resolve(KOK, 'scripts/ensure-dev-port.mjs')}"`, { stdio: 'inherit' });
  const proc = spawn('npm.cmd', ['run', 'dev'], {
    cwd: KOK,
    detached: true,
    stdio: 'ignore',
    shell: true,
  });
  proc.unref();
  const son = Date.now() + 40_000;
  while (Date.now() < son) {
    if (devServerAyakta()) return;
    execSync('powershell -NoProfile -Command "Start-Sleep -Milliseconds 800"', { windowsHide: true });
  }
  throw new Error('Dev server 40sn icinde ayaga kalkmadi');
}

async function adim(ad, fn) {
  try {
    await fn();
    sonuclar.push({ ad, ok: true });
    console.log(`  [PASS] ${ad}`);
  } catch (e) {
    sonuclar.push({ ad, ok: false, detay: String(e?.message ?? e) });
    console.log(`  [FAIL] ${ad}: ${e?.message ?? e}`);
  }
}

async function sayfadaBeklenen(beklenenler, timeout = 15000) {
  for (const metin of beklenenler) {
    await page.locator('body').getByText(metin, { exact: false }).first().waitFor({
      state: 'visible',
      timeout,
    });
  }
  const govde = await page.evaluate(() => document.body.innerText ?? '');
  if (govde.includes('Bir hata oluştu')) {
    throw new Error('Sayfada "Bir hata oluştu" ekrani gorundu');
  }
}

async function gez(rota, beklenenler, adimAdi) {
  await adim(adimAdi, async () => {
    await page.goto(BASE + rota.replace(/^\//, ''), { waitUntil: 'load', timeout: 30000 });
    await sayfadaBeklenen(beklenenler);
  });
}

async function girisYap(kullanici) {
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.locator('select').first().waitFor({ state: 'visible', timeout: 20000 });
  const mevcutSecenekler = await page.locator('select option').allTextContents();
  const secenek = mevcutSecenekler.find((s) => s.includes(kullanici));
  if (!secenek) throw new Error(`Login listesinde "${kullanici}" bulunamadi. Secenekler: ${mevcutSecenekler.join(', ')}`);
  await page.locator('select').first().selectOption({ label: secenek });
  await page.getByRole('button', { name: 'Giriş Yap' }).click();
  await page.waitForURL((url) => url.pathname === '/', { timeout: 30000 });
  await sayfadaBeklenen([SANTIYE_ADI]);
}

async function cikisYap() {
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Çıkış' }).click();
  await page.waitForURL((url) => url.pathname === '/login', { timeout: 15000 });
}

let page;

async function main() {
  if (!devServerAyakta()) {
    if (!OTO_BASLAT) {
      console.error('[tester] Dev server ayakta degil. Once "npm run dev", sonra tekrar deneyin.');
      console.error('[tester] Ya da --auto-start ile baslatilabilir.');
      process.exit(1);
    }
    devServeriBaslat();
  }

  const browser = await chromium.launch({ channel: 'chrome', headless: !HEADED });
  const context = await browser.newContext({
    viewport: { width: 480, height: 900 },
    locale: 'tr-TR',
  });
  page = await context.newPage();

  page.on('console', (m) => {
    const metin = m.text();
    if (m.type() === 'error') {
      konsolHatalari.push(metin);
    } else if (m.type() === 'warning' && /permission|denied|RLS|rpc/i.test(metin)) {
      konsolHatalari.push(`[warn] ${metin}`);
    }
  });
  page.on('pageerror', (e) => sayfaHatalari.push(String(e)));
  page.on('requestfailed', (r) => {
    const hata = r.failure()?.errorText ?? 'bilinmeyen';
    if (r.url().includes('supabase')) return;
    istekHatalari.push(`${r.method()} ${r.url()} -> ${hata}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 500 && !r.url().includes('supabase')) {
      istekHatalari.push(`${r.status()} ${r.url()}`);
    }
  });

  try {
    console.log(`\n===== Tarayici Testi (${USER}) =====`);
    console.log(`Baz: ${BASE}\n`);

    await adim('Giriş ekranına yönlendirme', async () => {
      await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
      await page.waitForURL((url) => url.pathname === '/login', { timeout: 15000 });
      await sayfadaBeklenen(['Rapor Takip Sistemi']);
    });

    await adim('Giriş yap (UI)', () => girisYap(USER));

    await gez('/', [SANTIYE_ADI], 'Dashboard');
    await gez('/adalar', ['Adalar', ILK_ADA], 'Adalar listesi');
    await gez(`/ada/${ILK_ADA}`, [ILK_ADA, 'Blok'], 'Ada detay');
    await gez(`/ada/${ILK_ADA}/blok/${ILK_BLOK}`, [`${ILK_ADA} - Blok ${ILK_BLOK}`], 'Blok detay');
    await gez('/raporlar', ['Raporlar'], 'Rapor listesi');
    await gez('/hedef-takvim', ['Hedef Takvimi'], 'Hedef takvim');
    await gez('/personel', ['Personel'], 'Personel');
    await gez('/istatistik', ['İstatistikler'], 'İstatistikler');
    await gez('/profil', ['Profil'], 'Profil');

    await adim('Rapor ekleme akışı (sihirbaz + kaydet)', async () => {
      await page.goto(BASE + 'rapor-ekle', { waitUntil: 'load', timeout: 30000 });
      await sayfadaBeklenen(['Rapor Ekle']);

      await page.locator('button').filter({ hasText: ILK_ADA }).first().click();
      await sayfadaBeklenen(['Blok Seçin']);

      await page.getByRole('button', { name: String(ILK_BLOK), exact: true }).click();
      await sayfadaBeklenen(['İş Kalemi']);

      const arama = page.locator('input[placeholder="İş kalemi ara..."]');
      await arama.waitFor({ state: 'visible', timeout: 10000 });
      await arama.fill(KALEM);
      await page.getByRole('button', { name: KALEM, exact: true }).click();
      await sayfadaBeklenen(['Durum', 'Açıklama']);

      await page.locator('textarea').fill(`Otomatik test: ${KALEM} - ${ILK_ADA}`);
      await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
      await page.waitForURL((url) => url.pathname === '/raporlar', { timeout: 15000 });
      await sayfadaBeklenen(['Raporlar', KALEM]);
    });

    await gez('/toplu-rapor', ['Toplu Rapor'], 'Toplu rapor (yönetici erişimi)');

    await adim('/ayarlar şantiye şefi için yasak (→ / yönlendirme)', async () => {
      await page.goto(BASE + 'ayarlar', { waitUntil: 'load', timeout: 30000 });
      await page.waitForURL((url) => url.pathname === '/', { timeout: 15000 });
      await sayfadaBeklenen([SANTIYE_ADI]);
    });

    await adim('Çıkış yap', cikisYap);

    if (PM) {
      console.log(`\n===== Proje Müdürü oturumu =====`);
      await adim('PM olarak giriş', () => girisYap('Proje Müdürü'));
      await gez('/ayarlar', ['Şantiye Ayarları'], 'PM /ayarlar');
      await gez('/yeni-santiye', ['Yeni Şantiye Kurulumu'], 'PM /yeni-santiye');
      await adim('PM çıkış', cikisYap);
    }
  } finally {
    await browser.close();
  }

  const basarisiz = sonuclar.filter((s) => !s.ok);
  console.log(`\n===== SONUÇ: ${sonuclar.length - basarisiz.length}/${sonuclar.length} adım geçti =====`);
  for (const s of sonuclar) {
    console.log(`  ${s.ok ? '[PASS]' : '[FAIL]'} ${s.ad}${s.detay ? ` -- ${s.detay}` : ''}`);
  }

  if (sayfaHatalari.length) {
    console.log(`\n[Sorun] JavaScript hataları (${sayfaHatalari.length}):`);
    sayfaHatalari.forEach((h) => console.log(`  ${h}`));
  }
  if (konsolHatalari.length) {
    console.log(`\n[Sorun] console.error (${konsolHatalari.length}):`);
    konsolHatalari.forEach((h) => console.log(`  ${h}`));
  }
  if (istekHatalari.length) {
    console.log(`\n[Uyarı] Başarısız/5xx istekler (${istekHatalari.length}):`);
    istekHatalari.forEach((h) => console.log(`  ${h}`));
  }

  process.exit(basarisiz.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('[tester] Beklenmeyen hata:', e);
  process.exit(1);
});
