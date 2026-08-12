// Dev server baslamadan once 5173 portunu kontrol eder.
// Baska bir projenin (veya eski oturumdan kalma) vite server'i portu
// isgal etmis ise onu kapatir; boylece `npm run dev` her zaman bu projeyi
// serve eder. Vite degil de bambaska bir program portta ise uyari verir
// ve cikis kodu 1 doner (vite strictPort ile zaten hata verir).

import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const PORT = 5173;
const PROJE_KOKU = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function portDinleyenPid(port) {
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8', windowsHide: true });
    for (const satir of out.split(/\r?\n/)) {
      const m = satir.match(/TCP\s+\S+:(\d+)\s+\S+:(\d+)\s+LISTENING\s+(\d+)/);
      if (m && Number(m[1]) === port) return Number(m[3]);
    }
  } catch {
    /* netstat calismadiysa portu bos say */
  }
  return null;
}

function komutSatiri(pid) {
  try {
    const r = spawnSync(
      'powershell',
      ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}').CommandLine`],
      { encoding: 'utf8', windowsHide: true }
    );
    return (r.stdout ?? '').trim();
  } catch {
    return '';
  }
}

function portSerbestMiBekle(pid) {
  for (let i = 0; i < 10; i++) {
    const simdi = portDinleyenPid(PORT);
    if (!simdi || simdi !== pid) return true;
    const sleep = spawnSync('powershell', ['-NoProfile', '-Command', 'Start-Sleep -Milliseconds 500'], { windowsHide: true });
    void sleep;
  }
  return false;
}

const pid = portDinleyenPid(PORT);
if (!pid) {
  console.log(`[dev-guard] Port ${PORT} bos.`);
  process.exit(0);
}

const cmd = komutSatiri(pid);
const viteMi = cmd.toLowerCase().includes('vite');
const buProjeMi = cmd.replaceAll('/', '\\').includes(PROJE_KOKU.replaceAll('/', '\\'));

if (!viteMi) {
  console.error(
    `[dev-guard] Port ${PORT} bir vite dev server'a ait degil (PID ${pid}). ` +
    `Bu prosesi kapatip tekrar deneyin, ya da baska bir port kullanin.`
  );
  process.exit(1);
}

if (buProjeMi) {
  console.log(`[dev-guard] Port ${PORT}'da bu projenin eski dev server'i (PID ${pid}) var, yeniden baslatiliyor.`);
} else {
  console.log(`[dev-guard] Port ${PORT}'da BASKA bir projenin dev server'i (PID ${pid}) var, kapatiliyor.`);
}

try {
  process.kill(pid);
} catch {
  /* proses zaten kapali olabilir */
}

if (!portSerbestMiBekle(pid)) {
  console.error(`[dev-guard] Port ${PORT} hala isgalde, dev server baslatilamiyor.`);
  process.exit(1);
}
console.log(`[dev-guard] Port ${PORT} serbest.`);
