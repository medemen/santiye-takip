import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDemo, buildInitScript, SCREENS } from './take-screenshots.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'screenshots', 'tablet7');
const PORT = 5174;
const BASE = `http://127.0.0.1:${PORT}/santiye_takip_15`;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// 7 inc tablet: 9:16 (portre), Play Console kenar siniri 320-3840px icinde.
const VIEWPORT = { width: 675, height: 1200 };
const DEVICE_SCALE = 2;

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
  console.log('Vite baslatiliyor (offline mod, tablet)...');
  await startVite();
  console.log('Vite hazir:', BASE);

  const demo = buildDemo();
  console.log(`Demo veri: ${demo.raporlar.length} rapor, ${demo.hedefler.length} hedef, ${demo.kullanicilar.length} kullanici`);

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  try {
    const ctx = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE,
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

main()
  .catch((err) => {
    console.error('HATA:', err.message);
    process.exitCode = 1;
  })
  .finally(() => {
    if (viteProc) viteProc.kill();
  });
