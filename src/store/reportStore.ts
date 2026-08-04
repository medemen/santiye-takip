import type { Rapor } from '../types';
import { getSupabase, isSupabaseReady } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toastGoster } from './toastStore';
import { getCurrentUser } from './authStore';

const STORAGE_KEY = 'santiye_raporlari_v2';

type Listener = () => void;
const _raporListeners = new Set<Listener>();

export function subscribeRaporChanges(listener: Listener): () => void {
  _raporListeners.add(listener);
  return () => { _raporListeners.delete(listener); };
}

function notifyRaporListeners(): void {
  _raporListeners.forEach(fn => fn());
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

export function aboneOlRaporGuncellemeleri(): void {
  if (!isSupabaseReady() || _raporChannel) return;
  _raporChannel = getSupabase()
    .channel('raporlar-realtime')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'raporlar' },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const raporlar = getRaporlar();
          if (!raporlar.find(r => r.id === payload.new.id)) {
            raporlar.push(payload.new as Rapor);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(raporlar));
          }
        } else if (payload.eventType === 'UPDATE') {
          const raporlar = getRaporlar();
          const idx = raporlar.findIndex(r => r.id === payload.new.id);
          if (idx !== -1) {
            raporlar[idx] = payload.new as Rapor;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(raporlar));
          }
        } else if (payload.eventType === 'DELETE') {
          const raporlar = getRaporlar();
          const filtered = raporlar.filter(r => r.id !== payload.old.id);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        }
        notifyRaporListeners();
      }
    )
    .subscribe();
}

export function realtimeRaporAboneliktenCik(): void {
  if (_raporChannel) {
    getSupabase().removeChannel(_raporChannel);
    _raporChannel = null;
  }
}

export function getRaporlar(): Rapor[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function supabaseRaporlariYukle(): Promise<void> {
  if (!isSupabaseReady()) return;
  try {
    const { data, error } = await getSupabase()
      .from('raporlar')
      .select('*')
      .order('olusturma_tarihi', { ascending: false });
    if (error) throw error;
    const sunucu = data ?? [];
    const sunucuIdleri = new Set(sunucu.map((r) => r.id));
    const yerel = getRaporlar();
    const bekleyen = yerel.filter((r) => !sunucuIdleri.has(r.id));
    const birlestirilmis = [...sunucu, ...bekleyen];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(birlestirilmis));
    notifyRaporListeners();
    if (bekleyen.length > 0) {
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
  const raporlar = getRaporlar();
  raporlar.push(yeni);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(raporlar));
  notifyRaporListeners();
  if (isSupabaseReady()) {
    getSupabase().from('raporlar').insert(raporToSupabase(yeni)).then(({ error }) => {
      if (error) {
        console.warn('Supabase rapor kaydetme hatası:', error.message);
        toastGoster('Rapor sunucuya kaydedilemedi: ' + error.message, 'error');
      }
    });
  }
  return yeni;
}

export function updateRapor(id: string, guncelleme: Partial<Omit<Rapor, 'id' | 'olusturma_tarihi'>>): boolean {
  const raporlar = getRaporlar();
  const idx = raporlar.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  raporlar[idx] = { ...raporlar[idx], ...guncelleme };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(raporlar));
  notifyRaporListeners();
  if (isSupabaseReady()) {
    getSupabase().from('raporlar').update(raporToSupabase(raporlar[idx])).eq('id', id).then(({ error }) => {
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
  const idx = raporlar.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  raporlar.splice(idx, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(raporlar));
  notifyRaporListeners();
  if (isSupabaseReady()) {
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

export function getBlokRaporlari(ada: string, blokNo: number): Rapor[] {
  return getRaporlar().filter(
    (r) => r.ada === ada && r.blok_no === blokNo
  );
}

export function getAdaRaporlari(ada: string): Rapor[] {
  return getRaporlar().filter((r) => r.ada === ada);
}

export function getPersonelRaporlari(adSoyad: string): Rapor[] {
  return getRaporlar().filter((r) => r.raporlayan === adSoyad);
}

function sonRaporBul(raporlar: Rapor[], ik: string): Rapor | null {
  const son = raporlar
    .filter((r) => r.is_kalemi === ik)
    .sort(
      (a, b) =>
        new Date(b.olusturma_tarihi).getTime() -
        new Date(a.olusturma_tarihi).getTime()
    );
  return son.length > 0 ? son[0] : null;
}

export function getBlokProgress(
  ada: string,
  blokNo: number,
  isKalemleri: readonly string[]
): Record<string, Rapor | null> {
  const raporlar = getBlokRaporlari(ada, blokNo);
  // blok_no=0 ada geneli raporlar devralma; blok özel raporu varsa o kazanır
  const adaGenel = blokNo !== 0
    ? getRaporlar().filter((r) => r.ada === ada && r.blok_no === 0)
    : [];
  const progress: Record<string, Rapor | null> = {};
  for (const ik of isKalemleri) {
    progress[ik] =
      sonRaporBul(raporlar, ik) ??
      (blokNo !== 0 ? sonRaporBul(adaGenel, ik) : null);
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

export function getSonRaporlar(limit = 10): Rapor[] {
  return getRaporlar()
    .sort(
      (a, b) =>
        new Date(b.olusturma_tarihi).getTime() -
        new Date(a.olusturma_tarihi).getTime()
    )
    .slice(0, limit);
}

export function getIstatistikler() {
  const raporlar = getRaporlar();
  const tamamlananIsler = raporlar.filter((r) => r.durum === 'tamamlandi').length;
  const devamEdenIsler = raporlar.filter((r) => r.durum === 'devam_ediyor').length;
  const planlananIsler = raporlar.filter((r) => r.durum === 'planlandi').length;
  const gecikenIsler = raporlar.filter((r) => r.durum === 'gecikme').length;
  const toplamRapor = raporlar.length;

  return {
    tamamlananIsler,
    devamEdenIsler,
    planlananIsler,
    gecikenIsler,
    toplamRapor,
  };
}
