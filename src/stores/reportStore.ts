import type { Rapor } from '../types';
import { getSupabase, isSupabaseReady } from '../lib/supabase';
import { getSiteConfig } from '../config/site';
import { idbGet, idbSet } from '../lib/db';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toastGoster } from './toastStore';
import { getCurrentUser, supabaseOturumAktif } from './authStore';

const STORAGE_KEY = `${getSiteConfig().marka.localStoragePrefix}_raporlar`;

type Listener = () => void;
const _raporListeners = new Set<Listener>();
let _version = 0;

// modul seviyesi cache: JSON.parse sadece ilk okumada yapilir
let _raporCache: Rapor[] | null = null;
// "ada|blokNo|isKalemi" -> en son rapor (tek parse'ta kurulur)
let _sonRaporHaritasi = new Map<string, Rapor>();

export function subscribeRaporChanges(listener: Listener): () => void {
  _raporListeners.add(listener);
  return () => { _raporListeners.delete(listener); };
}

export function getRaporVersion(): number {
  return _version;
}

function notifyRaporListeners(): void {
  _version++;
  _raporListeners.forEach(fn => fn());
}

function sonRaporHaritasiniKur(liste: Rapor[]): Map<string, Rapor> {
  const harita = new Map<string, Rapor>();
  for (const r of liste) {
    const anahtar = `${r.ada}|${r.blok_no}|${r.is_kalemi}`;
    const mevcut = harita.get(anahtar);
    if (!mevcut || new Date(r.olusturma_tarihi).getTime() > new Date(mevcut.olusturma_tarihi).getTime()) {
      harita.set(anahtar, r);
    }
  }
  return harita;
}

let _persistZamanlayici: ReturnType<typeof setTimeout> | null = null;
let _bekleyenVeri: Rapor[] | null = null;
let _persistDinleyiciBaglandi = false;
let _idbHydrasyonPromise: Promise<void> | null = null;

function raporlariYaz(liste: Rapor[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(liste));
  } catch {
    /* localStorage dolu/engelli olabilir */
  }
  void idbSet('raporlar', 'raporlar', liste);
}

function raporlariPersistEt(liste: Rapor[]): void {
  _bekleyenVeri = liste;
  if (_persistZamanlayici) clearTimeout(_persistZamanlayici);
  _persistZamanlayici = setTimeout(() => {
    _persistZamanlayici = null;
    if (_bekleyenVeri) {
      raporlariYaz(_bekleyenVeri);
      _bekleyenVeri = null;
    }
  }, 300);
  if (!_persistDinleyiciBaglandi) {
    _persistDinleyiciBaglandi = true;
    const bosalt = () => {
      if (_persistZamanlayici) clearTimeout(_persistZamanlayici);
      _persistZamanlayici = null;
      if (_bekleyenVeri) {
        raporlariYaz(_bekleyenVeri);
        _bekleyenVeri = null;
      }
    };
    window.addEventListener('pagehide', bosalt);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') bosalt();
    });
  }
}

function idbHydrasyonuBaslat(): Promise<void> {
  if (!_idbHydrasyonPromise) {
    _idbHydrasyonPromise = idbGet<Rapor[]>('raporlar', 'raporlar').then((veri) => {
      if (veri && veri.length > 0) {
        setRaporlar(veri);
      }
    });
  }
  return _idbHydrasyonPromise;
}

function setRaporlar(next: Rapor[]): void {
  _raporCache = next;
  _sonRaporHaritasi = sonRaporHaritasiniKur(next);
  raporlariPersistEt(next);
  notifyRaporListeners();
}

export function getRaporlar(): Rapor[] {
  if (!_raporCache) {
    let okunan: Rapor[] = [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      okunan = data ? JSON.parse(data) : [];
    } catch {
      /* bozuk veri olabilir */
    }
    _raporCache = okunan;
    _sonRaporHaritasi = sonRaporHaritasiniKur(okunan);
    void idbHydrasyonuBaslat();
  }
  return _raporCache;
}

function raporToSupabase(r: Rapor) {
  return {
    id: r.id,
    tarih: r.tarih,
    raporlayan: r.raporlayan,
    ada: r.ada,
    blok_no: r.blok_no,
    is_kalemi: r.is_kalemi,
    durum: r.durum,
    ilerleme_yuzde: r.ilerleme_yuzde,
    aciklama: r.aciklama || '',
    olusturma_tarihi: r.olusturma_tarihi,
    user_id: getCurrentUser()?.user_id ?? null,
  };
}

let _raporChannel: RealtimeChannel | null = null;

export function aboneOlRaporGuncellemeleri(onChannelStatus?: (status: string) => void): void {
  if (!supabaseOturumAktif() || _raporChannel) return;
  _raporChannel = getSupabase()
    .channel('raporlar-realtime')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'raporlar' },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const yeni = payload.new as Rapor;
          if (!getRaporlar().find(r => r.id === yeni.id)) {
            setRaporlar([...getRaporlar(), yeni]);
          }
        } else if (payload.eventType === 'UPDATE') {
          const guncel = payload.new as Rapor;
          setRaporlar(getRaporlar().map((r) => r.id === guncel.id ? guncel : r));
        } else if (payload.eventType === 'DELETE') {
          setRaporlar(getRaporlar().filter(r => r.id !== payload.old.id));
        }
      }
    )
    .subscribe((status) => onChannelStatus?.(status));
}

export function realtimeRaporAboneliktenCik(): void {
  if (_raporChannel) {
    getSupabase().removeChannel(_raporChannel);
    _raporChannel = null;
  }
}

export async function supabaseRaporlariYukle(): Promise<void> {
  if (!isSupabaseReady()) return;
  try {
    await idbHydrasyonuBaslat();
    const { data, error } = await getSupabase()
      .from('raporlar')
      .select('id, tarih, raporlayan, ada, blok_no, is_kalemi, durum, ilerleme_yuzde, aciklama, olusturma_tarihi')
      .order('olusturma_tarihi', { ascending: false });
    if (error) throw error;
    const sunucu = data ?? [];
    const sunucuIdleri = new Set(sunucu.map((r) => r.id));
    const yerel = getRaporlar();
    const bekleyen = yerel.filter((r) => !sunucuIdleri.has(r.id));
    const birlestirilmis = [...sunucu, ...bekleyen];
    setRaporlar(birlestirilmis);
    if (bekleyen.length > 0 && supabaseOturumAktif()) {
      const { error: upsertError } = await getSupabase()
        .from('raporlar')
        .upsert(bekleyen.map(raporToSupabase), { onConflict: 'id' });
      if (upsertError) {
        console.warn('Supabase yerel rapor yükleme hatası:', upsertError.message);
        toastGoster('Yerel raporlar sunucuya yüklenemedi: ' + upsertError.message, 'error');
      }
    }
  } catch {
    /* supabase offline, keep local data */
  }
}

export function saveRapor(rapor: Omit<Rapor, 'id' | 'olusturma_tarihi'>): Rapor {
  const yeni: Rapor = {
    ...rapor,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    olusturma_tarihi: new Date().toISOString(),
  };
  setRaporlar([...getRaporlar(), yeni]);
  if (supabaseOturumAktif()) {
    getSupabase().from('raporlar').insert(raporToSupabase(yeni)).then(({ error }) => {
      if (error) {
        console.warn('Supabase rapor kaydetme hatası:', error.message);
        toastGoster('Rapor sunucuya kaydedilemedi: ' + error.message, 'error');
      }
    });
  }
  return yeni;
}

export function saveRaporlar(
  raporlar: Array<Omit<Rapor, 'id' | 'olusturma_tarihi'>>
): Rapor[] {
  const yeniler: Rapor[] = raporlar.map((r) => ({
    ...r,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    olusturma_tarihi: new Date().toISOString(),
  }));
  setRaporlar([...getRaporlar(), ...yeniler]);
  if (supabaseOturumAktif()) {
    getSupabase()
      .from('raporlar')
      .insert(yeniler.map(raporToSupabase))
      .then(({ error }) => {
        if (error) {
          console.warn('Supabase toplu rapor kaydetme hatası:', error.message);
          toastGoster('Raporlar sunucuya kaydedilemedi: ' + error.message, 'error');
        }
      });
  }
  return yeniler;
}

export function updateRapor(id: string, guncelleme: Partial<Omit<Rapor, 'id' | 'olusturma_tarihi'>>): boolean {
  const raporlar = getRaporlar();
  const idx = raporlar.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  const guncel = { ...raporlar[idx], ...guncelleme };
  const yeniListe = [...raporlar];
  yeniListe[idx] = guncel;
  setRaporlar(yeniListe);
  if (supabaseOturumAktif()) {
    getSupabase().from('raporlar').update(raporToSupabase(guncel)).eq('id', id).then(({ error }) => {
      if (error) {
        console.warn('Supabase rapor güncelleme hatası:', error.message);
        toastGoster('Rapor sunucuya güncellenemedi: ' + error.message, 'error');
      }
    });
  }
  return true;
}

export function deleteRapor(id: string): boolean {
  const raporlar = getRaporlar();
  if (!raporlar.find((r) => r.id === id)) return false;
  setRaporlar(raporlar.filter((r) => r.id !== id));
  if (supabaseOturumAktif()) {
    getSupabase().from('raporlar').delete().eq('id', id).then(({ error }) => {
      if (error) {
        console.warn('Supabase rapor silme hatası:', error.message);
        toastGoster('Rapor sunucudan silinemedi: ' + error.message, 'error');
      }
    });
  }
  return true;
}

export function getRaporById(id: string): Rapor | undefined {
  return getRaporlar().find((r) => r.id === id);
}

export function getPersonelRaporlari(adSoyad: string): Rapor[] {
  return getRaporlar().filter((r) => r.raporlayan === adSoyad);
}

export function getSonRapor(ada: string, blokNo: number, isKalemi: string): Rapor | null {
  getRaporlar();
  return _sonRaporHaritasi.get(`${ada}|${blokNo}|${isKalemi}`) ?? null;
}

export function getBlokProgress(
  ada: string,
  blokNo: number,
  isKalemleri: readonly string[]
): Record<string, Rapor | null> {
  getRaporlar();
  // blok_no=0 ada geneli raporlar devralma; blok özel raporu varsa o kazanır
  const blokAnahtari = `${ada}|${blokNo}|`;
  const adaGenelAnahtari = `${ada}|0|`;
  const progress: Record<string, Rapor | null> = {};
  for (const ik of isKalemleri) {
    const blokRapor = _sonRaporHaritasi.get(blokAnahtari + ik);
    const adaGenelRapor = blokNo !== 0 ? _sonRaporHaritasi.get(adaGenelAnahtari + ik) ?? null : null;
    progress[ik] = blokRapor ?? adaGenelRapor;
  }
  return progress;
}

export function getBlokGenelIlerleme(
  ada: string,
  blokNo: number,
  isKalemleri: readonly string[]
): number {
  const progress = getBlokProgress(ada, blokNo, isKalemleri);
  const values = Object.values(progress);
  if (values.length === 0) return 0;
  const toplam = values.reduce((sum, r) => {
    if (!r) return sum;
    if (r.durum === 'tamamlandi') return sum + 100;
    return sum + r.ilerleme_yuzde;
  }, 0);
  return Math.round(toplam / values.length);
}

export function getAdaGenelIlerleme(
  ada: string,
  blokList: { blok_no: number }[],
  isKalemleri: readonly string[]
): number {
  if (blokList.length === 0) return 0;
  const toplam = blokList.reduce((sum, b) => {
    return sum + getBlokGenelIlerleme(ada, b.blok_no, isKalemleri);
  }, 0);
  return Math.round(toplam / blokList.length);
}

export function getIstatistikler(raporlar: Rapor[]) {
  let tamamlananIsler = 0;
  let devamEdenIsler = 0;
  let planlananIsler = 0;
  let gecikenIsler = 0;
  for (const r of raporlar) {
    if (r.durum === 'tamamlandi') tamamlananIsler++;
    else if (r.durum === 'devam_ediyor') devamEdenIsler++;
    else if (r.durum === 'planlandi') planlananIsler++;
    else if (r.durum === 'gecikme') gecikenIsler++;
  }

  return {
    tamamlananIsler,
    devamEdenIsler,
    planlananIsler,
    gecikenIsler,
    toplamRapor: raporlar.length,
  };
}
