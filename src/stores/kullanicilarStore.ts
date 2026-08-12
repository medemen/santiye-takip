import { getSupabase, isSupabaseReady } from '../lib/supabase';
import { getSiteConfig } from '../config/site';
import type { Personel, SantiyeSefi } from '../types';
import personelJson from '../../data/personel.json';

/**
 * Kullanici personel listesi. Kaynak onceligi:
 *   1. Supabase `kullanicilar` tablosu (localStorage'a onbelleklenir)
 *   2. localStorage onbellegi (offline)
 *   3. bundle icindeki data/personel.json (ilk bootstrap / tamamen offline)
 *
 * Santiye-sefi/proje-muduru gibi yetki tespitleri buradan yapilir.
 */

const STORAGE_KEY = `${getSiteConfig().marka.localStoragePrefix}_kullanicilar`;

export interface Kullanici {
  id: string | null;
  ad_soyad: string;
  rol: string;
  admin: boolean;
  proje_muduru: boolean;
  yetkili_adalar: string[];
  atanan_ada: string | null;
}

type Listener = () => void;
const _listeners = new Set<Listener>();

export function subscribeKullanicilarChanges(listener: Listener): () => void {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

function notifyListeners(): void {
  _listeners.forEach((fn) => fn());
}

const personel = personelJson as {
  santiye_sefleri: SantiyeSefi[];
  personel: Personel[];
};

function bundledKullanicilar(): Kullanici[] {
  const tumAdalar = personel.santiye_sefleri.flatMap((s) => s.adalar);
  const sefler: Kullanici[] = personel.santiye_sefleri.map((s) => ({
    id: null,
    ad_soyad: s.ad_soyad,
    rol: 'Şantiye Şefi',
    admin: true,
    proje_muduru: false,
    yetkili_adalar: s.adalar,
    atanan_ada: null,
  }));
  const ekip: Kullanici[] = personel.personel.map((p) => ({
    id: null,
    ad_soyad: p.ad_soyad,
    rol: p.rol,
    admin: false,
    proje_muduru: !!p.proje_muduru,
    yetkili_adalar: p.proje_muduru ? tumAdalar : [],
    atanan_ada: p.atanan_ada ?? null,
  }));
  return [...sefler, ...ekip];
}

function cachedKullanicilar(): Kullanici[] | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? (JSON.parse(data) as Kullanici[]) : null;
  } catch {
    return null;
  }
}

// modul seviyesi cache: JSON.parse yalnizca ilk okumada yapilir
let _kullaniciCache: Kullanici[] | null = null;

export function getKullanicilar(): Kullanici[] {
  if (!_kullaniciCache) {
    _kullaniciCache = cachedKullanicilar() ?? bundledKullanicilar();
  }
  return _kullaniciCache;
}

export async function supabaseKullanicilariYukle(): Promise<void> {
  if (!isSupabaseReady()) return;
  try {
    const { data, error } = await getSupabase()
      .from('kullanicilar')
      .select('id, ad_soyad, rol, admin, proje_muduru, yetkili_adalar, atanan_ada');
    if (error) throw error;
    const sunucu = (data ?? []) as Kullanici[];
    _kullaniciCache = sunucu;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sunucu));
    notifyListeners();
  } catch {
    /* offline: onbellek/bundle devam */
  }
}

export function kullaniciBul(adSoyad: string): Kullanici | undefined {
  return getKullanicilar().find((k) => k.ad_soyad === adSoyad);
}

export function isSantiyeSefi(adSoyad: string): boolean {
  return !!kullaniciBul(adSoyad)?.admin;
}

export function isProjeMuduru(adSoyad: string): boolean {
  return !!kullaniciBul(adSoyad)?.proje_muduru;
}

export function getSefAdalar(adSoyad: string): string[] {
  return kullaniciBul(adSoyad)?.yetkili_adalar ?? [];
}

export function getSantiyeSefi(ada: string): string {
  const sef = getKullanicilar().find(
    (k) => k.admin && k.yetkili_adalar.includes(ada)
  );
  return sef?.ad_soyad ?? 'Belirtilmemiş';
}

export function getBlokSorumlulari(ada: string): string[] {
  const sef = getKullanicilar().find(
    (k) => k.admin && k.yetkili_adalar.includes(ada)
  );
  if (!sef) return [];
  const sefAdalar = new Set(sef.yetkili_adalar);
  return getKullanicilar()
    .filter((k) => k.atanan_ada && sefAdalar.has(k.atanan_ada))
    .map((k) => k.ad_soyad);
}

export function getAdaPersonelleri(ada: string): Kullanici[] {
  return getKullanicilar().filter((k) => k.atanan_ada === ada);
}

export function getAtanmamisPersonel(): Kullanici[] {
  return getKullanicilar().filter((k) => !k.atanan_ada);
}

export function getPersonelBySef(sefAdi: string): Kullanici[] {
  const sef = kullaniciBul(sefAdi);
  if (!sef) return [];
  const sefAdalar = new Set(sef.yetkili_adalar);
  return getKullanicilar().filter(
    (k) => k.atanan_ada && sefAdalar.has(k.atanan_ada)
  );
}

export function getAllPersonel() {
  return getKullanicilar().map((k) => ({
    id: k.id,
    ad_soyad: k.ad_soyad,
    rol: k.rol,
    atanan_ada: k.atanan_ada,
    admin: k.admin,
    proje_muduru: k.proje_muduru,
  }));
}
