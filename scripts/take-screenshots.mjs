import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'screenshots');
const PREFIX = 'santiyev2';
const PORT = 5173;
const BASE = `http://127.0.0.1:${PORT}/santiye_takip_15`;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const adalarJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'adalar_bloklar.json'), 'utf8'));
const personelJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'personel.json'), 'utf8'));
const configJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'santiye.config.json'), 'utf8'));

const adalar = adalarJson.adalar;
const adaList = adalar.map((a) => a.ada);
const GRUP_SIRASI = ['kaba-isler', 'duvar-yalitim', 'ic-siva', 'doseme', 'seramik', 'dis-cephe'];
const byId = Object.fromEntries((configJson.isKalemleri.gruplar ?? []).map((g) => [g.id, g]));
const KALEMLER = GRUP_SIRASI.flatMap((id) => byId[id]?.kalemler ?? []);

const rnd = (() => {
  let seed = 987654321;
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isoDaysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fullISO(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(9 + Math.floor(rnd() * 10), Math.floor(rnd() * 60), 0, 0);
  return d.toISOString();
}

const ACIKLAMALAR = [
  'Günlük ilerleme kaydedildi.',
  'Kalıp ve demir işleri tamamlandı.',
  'Beton dökümü gerçekleştirildi.',
  'Duvar örme işi devam ediyor.',
  'Sıva işlemleri ilerliyor.',
  'İşçilikte gecikme yaşanıyor.',
  'Malzeme temini bekleniyor.',
  'İş programına uygun ilerliyor.',
  'Bir sonraki aşamaya geçildi.',
  'Kontrol ve tesviye yapıldı.',
];

function buildKullanicilar() {
  const users = [];
  for (const s of personelJson.santiye_sefleri ?? []) {
    users.push({
      id: null, ad_soyad: s.ad_soyad, rol: 'Şantiye Şefi', admin: true, proje_muduru: false,
      yetkili_adalar: s.adalar, atanan_ada: null,
    });
  }
  for (const p of personelJson.personel ?? []) {
    const pm = !!p.proje_muduru;
    users.push({
      id: null, ad_soyad: p.ad_soyad, rol: p.rol, admin: pm, proje_muduru: pm,
      yetkili_adalar: pm ? adaList : [], atanan_ada: p.atanan_ada ?? null,
    });
  }
  let i = 0;
  for (const u of users) {
    if (!u.admin && !u.proje_muduru) {
      u.atanan_ada = adaList[i % adaList.length];
      i++;
    }
  }
  return users;
}

function buildAtamalar(users) {
  const adaAtamalari = {};
  const blokAtamalari = {};
  let k = 0;
  for (const u of users) {
    if (!u.atanan_ada) continue;
    adaAtamalari[u.ad_soyad] = u.atanan_ada;
    const ada = u.atanan_ada;
    const blokSayisi = adalar.find((a) => a.ada === ada)?.bloklar.length ?? 1;
    const bloklar = [];
    for (let b = 1; b <= blokSayisi; b++) if (k % 3 === 0) bloklar.push(b);
    blokAtamalari[u.ad_soyad] = { [ada]: bloklar };
    k++;
  }
  return { adaAtamalari, blokAtamalari };
}

function buildRaporlar(users) {
  const saha = users.filter((u) => u.atanan_ada);
  const raporlayanByAda = (ada) => {
    const l = saha.filter((u) => u.atanan_ada === ada).map((u) => u.ad_soyad);
    return l.length > 0 ? l : ['Mehmet Kılıç'];
  };

  const raporlar = [];
  let sayac = 1;
  const ekle = (ada, blokNo, isKalemi, durum, ilerleme, tarihDaysAgo, aciklama, raporlayan) => {
    raporlar.push({
      id: `demo-${sayac++}`,
      tarih: isoDaysAgo(tarihDaysAgo),
      raporlayan,
      ada,
      blok_no: blokNo,
      is_kalemi: isKalemi,
      durum,
      ilerleme_yuzde: durum === 'tamamlandi' ? 100 : ilerleme,
      aciklama,
      olusturma_tarihi: fullISO(tarihDaysAgo),
    });
  };

  const ADA_BASE_DEPTH = { 'ADA-1': 9, 'ADA-2': 7, 'ADA-3': 6, 'ADA-4': 5, 'ADA-5': 4, 'ADA-6': 3 };
  const BLOCK_CAP = { 'ADA-1': 10, 'ADA-2': 6, 'ADA-3': 6, 'ADA-4': 5, 'ADA-5': 5, 'ADA-6': 4 };

  for (const adaObj of adalar) {
    const ada = adaObj.ada;
    const base = ADA_BASE_DEPTH[ada] ?? 3;
    const roporlayan = raporlayanByAda(ada);
    for (const blk of adaObj.bloklar.slice(0, BLOCK_CAP[ada] ?? 6)) {
      const b = blk.blok_no;
      let depth = base + Math.floor(rnd() * 5) - 2;
      if (ada === 'ADA-1' && b <= 4) depth = 10 + Math.floor(rnd() * 3);
      if (ada === 'ADA-1' && b === 1) depth = 13;
      depth = Math.max(1, Math.min(KALEMLER.length, depth));

      for (let k = 0; k < depth; k++) {
        const kalem = KALEMLER[k];
        let durum = 'tamamlandi';
        let ilerleme = 100;
        let tarihDaysAgo = 20 + Math.floor(rnd() * 30);
        if (k === depth - 1) {
          const r = rnd();
          if (r < 0.22) {
            durum = 'gecikme';
            ilerleme = 40 + Math.floor(rnd() * 40);
            tarihDaysAgo = 2 + Math.floor(rnd() * 5);
          } else if (r < 0.55) {
            durum = 'devam_ediyor';
            ilerleme = 50 + Math.floor(rnd() * 35);
            tarihDaysAgo = 1 + Math.floor(rnd() * 6);
          }
        } else if (k === depth - 2 && rnd() < 0.1) {
          durum = 'gecikme';
          ilerleme = 70 + Math.floor(rnd() * 25);
          tarihDaysAgo = 3 + Math.floor(rnd() * 4);
        }
        ekle(ada, b, kalem, durum, ilerleme, tarihDaysAgo, pick(ACIKLAMALAR), pick(roporlayan));
      }
      if (depth < KALEMLER.length && rnd() < 0.45) {
        ekle(ada, b, KALEMLER[depth], 'devam_ediyor', 20 + Math.floor(rnd() * 40), Math.floor(rnd() * 4), pick(ACIKLAMALAR), pick(roporlayan));
      }
    }
  }

  const bilinenGecikmeler = [
    ['ADA-1', 3, 'Kaba Sıva', 45],
    ['ADA-1', 5, 'Yapı Duvarı', 60],
    ['ADA-2', 2, 'Şap', 30],
    ['ADA-3', 4, 'Duvar seramik', 55],
    ['ADA-4', 1, 'Saten Alçı', 35],
  ];
  for (const [ada, blokNo, isKalemi, ilerleme] of bilinenGecikmeler) {
    ekle(ada, blokNo, isKalemi, 'gecikme', ilerleme, 2 + Math.floor(rnd() * 3), 'İş programında gecikme yaşanıyor.', pick(raporlayanByAda(ada)));
  }
  return raporlar;
}

function buildHedefler(raporlar) {
  const aktif = raporlar.filter((r) => r.durum !== 'tamamlandi');
  const kalan = [...aktif];
  const secimler = [
    ['ADA-1', 1, 3], ['ADA-1', 1, 8], ['ADA-1', 2, 5], ['ADA-1', 2, 12],
    ['ADA-1', 3, 1], ['ADA-1', 3, -4], ['ADA-1', 4, 7], ['ADA-2', 1, 2],
    ['ADA-2', 2, 10], ['ADA-1', 5, -9], ['ADA-1', 6, 15], ['ADA-2', 3, 6],
  ];
  const hedefler = [];
  let id = 1;
  for (const [ada, blokNo, gun] of secimler) {
    const r = kalan.find((x) => x.ada === ada && x.blok_no === blokNo);
    if (!r) continue;
    hedefler.push({ id: id++, ada, blok_no: blokNo, is_kalemi: r.is_kalemi, hedef_tarih: isoDaysFromNow(gun) });
  }
  return hedefler;
}

function buildDemo() {
  const kullanicilar = buildKullanicilar();
  const { adaAtamalari, blokAtamalari } = buildAtamalar(kullanicilar);
  const raporlar = buildRaporlar(kullanicilar);
  const hedefler = buildHedefler(raporlar);
  const oturum = {
    user_id: null,
    ad_soyad: 'Proje Müdürü',
    rol: 'Proje Müdürü',
    admin: true,
    proje_muduru: true,
    yetkili_adalar: adaList,
    giris_tarihi: new Date().toISOString(),
  };
  return { oturum, raporlar, hedefler, kullanicilar, adaAtamalari, blokAtamalari };
}

const SVG_ICONS = `
<svg width="17" height="12" viewBox="0 0 17 12" fill="#1f2937"><rect x="0" y="8" width="3" height="4" rx="0.6"/><rect x="4.5" y="6" width="3" height="6" rx="0.6"/><rect x="9" y="3.4" width="3" height="8.6" rx="0.6"/><rect x="13.5" y="0.8" width="3" height="11.2" rx="0.6"/></svg>
<svg width="16" height="12" viewBox="0 0 16 12" fill="#1f2937"><path d="M8 10.2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/><path d="M8 5.7a5 5 0 0 0-3.53 1.46l1.06 1.07A3.5 3.5 0 0 1 8 7.2a3.5 3.5 0 0 1 2.47 1.03l1.06-1.07A5 5 0 0 0 8 5.7z"/><path d="M8 1.2a9 9 0 0 0-6.36 2.63l1.06 1.07A7.5 7.5 0 0 1 8 2.7a7.5 7.5 0 0 1 5.3 2.2l1.06-1.07A9 9 0 0 0 8 1.2z"/></svg>
<svg width="26" height="12" viewBox="0 0 26 12"><rect x="0.6" y="0.6" width="20.8" height="10.8" rx="2.6" fill="none" stroke="#1f2937" stroke-width="1.1"/><rect x="2.2" y="2.2" width="13.6" height="7.6" rx="1" fill="#22c55e"/><rect x="23" y="3.6" width="2.4" height="4.8" rx="1" fill="#1f2937"/></svg>`;

const STATUS_BAR_JS = `
function psAddUi(){
  if (document.getElementById('ps-statusbar')) return;
  var sb = document.createElement('div');
  sb.id = 'ps-statusbar';
  sb.style.cssText = 'height:26px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;background:#f8fafc;color:#1f2937;font-size:14px;font-weight:600;-webkit-font-smoothing:antialiased;';
  sb.innerHTML = \`<span>09:41</span><div style="display:flex;align-items:center;gap:7px">${SVG_ICONS}</div>\`;
  document.body.insertBefore(sb, document.body.firstChild);
  var pill = document.createElement('div');
  pill.id = 'ps-home';
  pill.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:6px;width:120px;height:4px;border-radius:2px;background:rgba(15,23,42,0.25);z-index:99999;pointer-events:none;';
  document.body.appendChild(pill);
}
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', psAddUi); } else { psAddUi(); }
`;

function buildInitScript(demo) {
  const data = {};
  if (demo) {
    data[`${PREFIX}_oturum`] = demo.oturum;
    data[`${PREFIX}_raporlar`] = demo.raporlar;
    data[`${PREFIX}_hedefler`] = demo.hedefler;
    data[`${PREFIX}_kullanicilar`] = demo.kullanicilar;
    data[`${PREFIX}_ada_atamalari`] = demo.adaAtamalari;
    data[`${PREFIX}_blok_atamalari`] = demo.blokAtamalari;
  }
  const json = JSON.stringify(data);
  return `(()=>{ var D = ${json}; try { for (var k in D) { localStorage.setItem(k, JSON.stringify(D[k])); } } catch(e) { console.error('seed', e); } ${STATUS_BAR_JS} })();`;
}

const SCREENS = [
  { file: '01-dashboard.png', path: '/' },
  { file: '02-adalar.png', path: '/adalar' },
  { file: '03-hedef-takvim.png', path: '/hedef-takvim' },
  { file: '04-ada-detay.png', path: '/ada/ADA-1' },
  { file: '05-blok-detay.png', path: '/ada/ADA-1/blok/1' },
  { file: '06-rapor-ekle.png', path: '/rapor-ekle?ada=ADA-1&blok=1', clickText: 'KABA İŞLER' },
  { file: '07-raporlar.png', path: '/raporlar' },
  { file: '08-istatistik.png', path: '/istatistik' },
];

function pngSize(buf) {
  if (buf.length < 24 || buf[0] !== 0x89 || buf[1] !== 0x50) return null;
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return { w, h };
}

let viteProc = null;
function startVite() {
  return new Promise((resolve, reject) => {
    const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
    const env = { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' };
    const child = spawn(process.execPath, [viteBin, '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
      cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    });
    viteProc = child;
    let out = '';
    const onData = (d) => {
      out += d.toString();
      const ansi = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*[A-Za-z]', 'g');
      const temiz = out.replace(ansi, '');
      if (temiz.includes(`:${PORT}/`)) resolve();
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => {
      if (code !== null && code !== 0) {
        reject(new Error(`Vite cikti (${code}):\n${out.slice(-2000)}`));
      }
    });
    setTimeout(() => reject(new Error('Vite baslama zaman asimi:\n' + out.slice(-2000))), 30000);
  });
}

async function shot(page, file, extra) {
  if (extra?.clickText) {
    const btn = page.locator('button').filter({ hasText: extra.clickText }).first();
    try { await btn.click({ timeout: 4000 }); } catch { /* yok say */ }
    await page.waitForTimeout(400);
  }
  const buf = await page.screenshot({ type: 'png' });
  fs.writeFileSync(file, buf);
  const size = pngSize(buf);
  const bytes = fs.statSync(file).size;
  console.log(`${path.basename(file)}  ${size ? size.w + 'x' + size.h : '?'}  ${(bytes / 1024).toFixed(0)} KB`);
  return size;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  console.log('Vite baslatiliyor (offline mod)...');
  await startVite();
  console.log('Vite hazir:', BASE);

  const demo = buildDemo();
  console.log(`Demo veri: ${demo.raporlar.length} rapor, ${demo.hedefler.length} hedef, ${demo.kullanicilar.length} kullanici`);

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  try {
    // GIRIS EKRANI (oturumsuz)
    {
      const ctx = await browser.newContext({
        viewport: { width: 540, height: 960 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      await ctx.addInitScript(buildInitScript(null));
      const page = await ctx.newPage();
      await page.goto(`${BASE}/login`, { waitUntil: 'load', timeout: 30000 });
      await page.getByText('Giriş Yap').first().waitFor({ timeout: 15000 });
      await page.waitForTimeout(1200);
      await shot(page, path.join(OUT, '09-giris.png'), null);
      await ctx.close();
    }

    // UYGULAMA EKRANLARI (demo oturumlu)
    const ctx = await browser.newContext({
      viewport: { width: 540, height: 960 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await ctx.addInitScript(buildInitScript(demo));
    const page = await ctx.newPage();

    for (const s of SCREENS) {
      await page.goto(`${BASE}${s.path}`, { waitUntil: 'load', timeout: 30000 });
      await page.locator('nav').first().waitFor({ timeout: 15000 });
      await page.waitForTimeout(1800);
      await shot(page, path.join(OUT, s.file), s);
    }
    await ctx.close();
  } finally {
    await browser.close();
  }

  console.log('\nTamam. Cikti: ' + OUT);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main()
    .catch((err) => {
      console.error('HATA:', err.message);
      process.exitCode = 1;
    })
    .finally(() => {
      if (viteProc) viteProc.kill();
    });
}

export { buildDemo, buildInitScript, PREFIX, OUT, SCREENS };
