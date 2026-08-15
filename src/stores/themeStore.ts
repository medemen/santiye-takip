import { getSiteConfig } from '../config/site';

const STORAGE_KEY = `${getSiteConfig().marka.localStoragePrefix}_tema`;

export type TemaSecim = 'light' | 'dark' | 'system';

type Listener = () => void;
const _temaListeners = new Set<Listener>();
let _temaVersion = 0;

let _secim: TemaSecim | null = null;
let _init = false;

function sistemKaranlikMi(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function mevcutTema(): 'light' | 'dark' {
  const secim = _secim ?? 'system';
  if (secim === 'system') return sistemKaranlikMi() ? 'dark' : 'light';
  return secim;
}

export function temaSeciminiUygula(): void {
  if (typeof document === 'undefined') return;
  const tema = mevcutTema();
  document.documentElement.dataset.theme = tema;
  document.documentElement.style.colorScheme = tema;
}

function baslat(): void {
  if (_init) return;
  _init = true;
  try {
    const kayit = localStorage.getItem(STORAGE_KEY);
    if (kayit === 'light' || kayit === 'dark' || kayit === 'system') {
      _secim = kayit;
    }
  } catch {
    /* localStorage engelli olabilir */
  }
  temaSeciminiUygula();
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (_secim === 'system') {
        temaSeciminiUygula();
        _temaListeners.forEach((fn) => fn());
      }
    });
  }
}

export function getTemaSecim(): TemaSecim {
  baslat();
  return _secim ?? 'system';
}

export function getTemaTema(): 'light' | 'dark' {
  baslat();
  return mevcutTema();
}

export function setTemaSecim(secim: TemaSecim): void {
  baslat();
  _secim = secim;
  try {
    localStorage.setItem(STORAGE_KEY, secim);
  } catch {
    /* localStorage engelli olabilir */
  }
  temaSeciminiUygula();
  _temaVersion++;
  _temaListeners.forEach((fn) => fn());
}

export function subscribeTemaChanges(listener: Listener): () => void {
  baslat();
  _temaListeners.add(listener);
  return () => { _temaListeners.delete(listener); };
}

export function getTemaVersion(): number {
  baslat();
  return _temaVersion;
}
