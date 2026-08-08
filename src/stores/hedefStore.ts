import type { IsKalemiHedefi } from '../types';
import { getSupabase, isSupabaseReady } from '../lib/supabase';
import { getSiteConfig } from '../config/site';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toastGoster } from './toastStore';
import { getCurrentUser } from './authStore';

const STORAGE_KEY = `${getSiteConfig().marka.localStoragePrefix}_hedefler`;

type Listener = () => void;
const _hedefListeners = new Set<Listener>();
let _version = 0;

export function subscribeHedefChanges(listener: Listener): () => void {
  _hedefListeners.add(listener);
  return () => { _hedefListeners.delete(listener); };
}

export function getHedefVersion(): number {
  return _version;
}

function notifyHedefListeners(): void {
  _version++;
  _hedefListeners.forEach(fn => fn());
}

let _hedefChannel: RealtimeChannel | null = null;

export function aboneOlHedefGuncellemeleri(onChannelStatus?: (status: string) => void): void {
  if (!isSupabaseReady() || _hedefChannel) return;
  _hedefChannel = getSupabase()
    .channel('hedef-realtime')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'is_kalemi_hedefleri' },
      () => {
        supabaseHedefleriYukle();
        notifyHedefListeners();
      }
    )
    .subscribe((status) => onChannelStatus?.(status));
}

export function realtimeHedefAboneliktenCik(): void {
  if (_hedefChannel) {
    getSupabase().removeChannel(_hedefChannel);
    _hedefChannel = null;
  }
}

export function getHedefler(): IsKalemiHedefi[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function supabaseHedefleriYukle(): Promise<void> {
  if (!isSupabaseReady()) return;
  try {
    const { data, error } = await getSupabase()
      .from('is_kalemi_hedefleri')
      .select('*');
    if (error) throw error;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data ?? []));
    notifyHedefListeners();
  } catch {
    /* supabase offline, cache devam */
  }
}

export function getBlokHedefleri(ada: string, blokNo: number): IsKalemiHedefi[] {
  return getHedefler().filter((h) => h.ada === ada && h.blok_no === blokNo);
}

export function getAdaHedefleri(ada: string): IsKalemiHedefi[] {
  return getHedefler().filter((h) => h.ada === ada);
}

export function getHedef(ada: string, blokNo: number, isKalemi: string): IsKalemiHedefi | undefined {
  return getHedefler().find((h) => h.ada === ada && h.blok_no === blokNo && h.is_kalemi === isKalemi);
}

export function hedefDuzetmeYetkisiVarMi(): boolean {
  const user = getCurrentUser();
  return !!user && (user.admin || user.proje_muduru);
}

export function setHedef(
  ada: string,
  blokNo: number,
  isKalemi: string,
  hedefTarih: string | null
): boolean {
  if (!hedefDuzetmeYetkisiVarMi()) return false;

  const hedefler = getHedefler();
  const idx = hedefler.findIndex((h) => h.ada === ada && h.blok_no === blokNo && h.is_kalemi === isKalemi);

  if (hedefTarih === null || hedefTarih === '') {
    if (idx !== -1) hedefler.splice(idx, 1);
  } else if (idx !== -1) {
    hedefler[idx] = { ...hedefler[idx], hedef_tarih: hedefTarih };
  } else {
    hedefler.push({
      id: 0,
      ada,
      blok_no: blokNo,
      is_kalemi: isKalemi,
      hedef_tarih: hedefTarih,
    });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hedefler));
  notifyHedefListeners();

  if (isSupabaseReady()) {
    if (hedefTarih === null || hedefTarih === '') {
      getSupabase()
        .from('is_kalemi_hedefleri')
        .delete()
        .eq('ada', ada)
        .eq('blok_no', blokNo)
        .eq('is_kalemi', isKalemi)
        .then(({ error }) => {
          if (error) {
            console.warn('Supabase hedef silme hatası:', error.message);
            toastGoster('Hedef sunucudan silinemedi: ' + error.message, 'error');
          }
        });
    } else {
      getSupabase()
        .from('is_kalemi_hedefleri')
        .upsert(
          { ada, blok_no: blokNo, is_kalemi: isKalemi, hedef_tarih: hedefTarih },
          { onConflict: 'ada, blok_no, is_kalemi' }
        )
        .then(({ error }) => {
          if (error) {
            console.warn('Supabase hedef kaydetme hatası:', error.message);
            toastGoster('Hedef sunucuya kaydedilemedi: ' + error.message, 'error');
          }
        });
    }
  }
  return true;
}
