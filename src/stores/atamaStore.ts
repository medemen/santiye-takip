import type { KullaniciAtamalari, BlokAtamasi } from '../types';
import { getSupabase, isSupabaseReady } from '../lib/supabase';
import { getSiteConfig } from '../config/site';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toastGoster } from './toastStore';
import { getCurrentUser } from './authStore';

const PREFIX = getSiteConfig().marka.localStoragePrefix;
const BLOK_KEY = `${PREFIX}_blok_atamalari`;
const ADA_KEY = `${PREFIX}_ada_atamalari`;

let _adaChannel: RealtimeChannel | null = null;
let _blokChannel: RealtimeChannel | null = null;

export function aboneOlAtamaGuncellemeleri(onChannelStatus?: (status: string) => void): void {
  if (!isSupabaseReady()) return;

  if (!_adaChannel) {
    _adaChannel = getSupabase()
      .channel('ada-atama-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'kullanici_ada_atamalari' },
        () => {
          supabaseAtamalariYukle();
        }
      )
      .subscribe((status) => onChannelStatus?.(status));
  }

  if (!_blokChannel) {
    _blokChannel = getSupabase()
      .channel('blok-atama-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'kullanici_blok_atamalari' },
        () => {
          supabaseAtamalariYukle();
        }
      )
      .subscribe((status) => onChannelStatus?.(status));
  }
}

export function realtimeAtamaAboneliktenCik(): void {
  if (_adaChannel) {
    getSupabase().removeChannel(_adaChannel);
    _adaChannel = null;
  }
  if (_blokChannel) {
    getSupabase().removeChannel(_blokChannel);
    _blokChannel = null;
  }
}

function getBlokAtamalar(): KullaniciAtamalari {
  try {
    const data = localStorage.getItem(BLOK_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveBlokAtamalar(atamalar: KullaniciAtamalari): void {
  localStorage.setItem(BLOK_KEY, JSON.stringify(atamalar));
}

export function getKullaniciBlokAtamasi(ad_soyad: string): BlokAtamasi {
  const atamalar = getBlokAtamalar();
  return atamalar[ad_soyad] || {};
}

export function setKullaniciBlokAtamasi(ad_soyad: string, atama: BlokAtamasi): void {
  const atamalar = getBlokAtamalar();
  atamalar[ad_soyad] = atama;
  saveBlokAtamalar(atamalar);
  if (isSupabaseReady()) {
    const supabase = getSupabase();
    for (const [ada, blokNos] of Object.entries(atama)) {
      if (blokNos.length === 0) {
        supabase.from('kullanici_blok_atamalari').delete().eq('ad_soyad', ad_soyad).eq('ada', ada).then(({ error }) => {
          if (error) {
            console.warn('Supabase blok atama silme hatası:', error.message);
            toastGoster('Blok ataması sunucuya işlenemedi: ' + error.message, 'error');
          }
        });
      } else {
        supabase.from('kullanici_blok_atamalari').upsert(
          { ad_soyad, ada, blok_nos: blokNos, updated_at: new Date().toISOString(), user_id: getCurrentUser()?.user_id ?? null },
          { onConflict: 'ad_soyad, ada' }
        ).then(({ error }) => {
          if (error) {
            console.warn('Supabase blok atama hatası:', error.message);
            toastGoster('Blok ataması sunucuya kaydedilemedi: ' + error.message, 'error');
          }
        });
      }
    }
  }
}

export function getKullaniciBloklari(ad_soyad: string, ada: string): number[] {
  const atama = getKullaniciBlokAtamasi(ad_soyad);
  return atama[ada] || [];
}

function getAdaAtamalar(): Record<string, string | null> {
  try {
    const data = localStorage.getItem(ADA_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveAdaAtamalar(atamalar: Record<string, string | null>): void {
  localStorage.setItem(ADA_KEY, JSON.stringify(atamalar));
}

export function setKullaniciAdaAtamasi(ad_soyad: string, ada: string | null): void {
  const atamalar = getAdaAtamalar();
  if (ada === null) {
    delete atamalar[ad_soyad];
  } else {
    atamalar[ad_soyad] = ada;
  }
  saveAdaAtamalar(atamalar);
  if (isSupabaseReady()) {
    if (ada === null) {
      getSupabase().from('kullanici_ada_atamalari').delete().eq('ad_soyad', ad_soyad).then(({ error }) => {
        if (error) {
          console.warn('Supabase ada atama silme hatası:', error.message);
          toastGoster('Ada ataması sunucuya işlenemedi: ' + error.message, 'error');
        }
      });
    } else {
      getSupabase().from('kullanici_ada_atamalari').upsert(
        { ad_soyad, ada, updated_at: new Date().toISOString(), user_id: getCurrentUser()?.user_id ?? null },
        { onConflict: 'ad_soyad' }
      ).then(({ error }) => {
        if (error) {
          console.warn('Supabase ada atama hatası:', error.message);
          toastGoster('Ada ataması sunucuya kaydedilemedi: ' + error.message, 'error');
        }
      });
    }
  }
}

export function getKullaniciAdaAtamasi(ad_soyad: string): string | null {
  const atamalar = getAdaAtamalar();
  if (ad_soyad in atamalar) {
    return atamalar[ad_soyad];
  }
  return null;
}

export async function supabaseAtamalariYukle(): Promise<void> {
  if (!isSupabaseReady()) return;
  try {
    const { data: adaRows, error: adaError } = await getSupabase()
      .from('kullanici_ada_atamalari')
      .select('*');
    if (adaError) throw adaError;

    const yerelAda = getAdaAtamalar();
    const sunucuAda: Record<string, string | null> = {};
    for (const row of adaRows ?? []) {
      sunucuAda[row.ad_soyad] = row.ada;
    }
    saveAdaAtamalar({ ...yerelAda, ...sunucuAda });

    const bekleyenAda = Object.entries(yerelAda).filter(([ad]) => !(ad in sunucuAda));
    for (const [ad, ada] of bekleyenAda) {
      const { error } = await getSupabase()
        .from('kullanici_ada_atamalari')
        .upsert({ ad_soyad: ad, ada, updated_at: new Date().toISOString(), user_id: getCurrentUser()?.user_id ?? null }, { onConflict: 'ad_soyad' });
      if (error) {
        console.warn('Supabase yerel ada atama yükleme hatası:', error.message);
        toastGoster('Yerel ada atamaları sunucuya yüklenemedi: ' + error.message, 'error');
      }
    }

    const { data: blokRows, error: blokError } = await getSupabase()
      .from('kullanici_blok_atamalari')
      .select('*');
    if (blokError) throw blokError;

    const yerelBlok = getBlokAtamalar();
    const sunucuBlok: KullaniciAtamalari = {};
    for (const row of blokRows ?? []) {
      if (!sunucuBlok[row.ad_soyad]) {
        sunucuBlok[row.ad_soyad] = {};
      }
      sunucuBlok[row.ad_soyad][row.ada] = row.blok_nos || [];
    }
    const birlestirilmisBlok: KullaniciAtamalari = { ...yerelBlok };
    for (const [ad, adaMap] of Object.entries(sunucuBlok)) {
      if (!birlestirilmisBlok[ad]) {
        birlestirilmisBlok[ad] = {};
      }
      birlestirilmisBlok[ad] = { ...birlestirilmisBlok[ad], ...adaMap };
    }
    saveBlokAtamalar(birlestirilmisBlok);

    const bekleyenBlok: { ad_soyad: string; ada: string; blok_nos: number[] }[] = [];
    for (const [ad, adaMap] of Object.entries(yerelBlok)) {
      for (const [ada, blokNos] of Object.entries(adaMap)) {
        if (blokNos.length > 0 && !sunucuBlok[ad]?.[ada]) {
          bekleyenBlok.push({ ad_soyad: ad, ada, blok_nos: blokNos });
        }
      }
    }
    if (bekleyenBlok.length > 0) {
      const { error } = await getSupabase()
        .from('kullanici_blok_atamalari')
        .upsert(bekleyenBlok, { onConflict: 'ad_soyad, ada' });
      if (error) {
        console.warn('Supabase yerel blok atama yükleme hatası:', error.message);
        toastGoster('Yerel blok atamaları sunucuya yüklenemedi: ' + error.message, 'error');
      }
    }

  } catch (err) {
    console.error('Supabase atama yükleme hatası:', err);
  }
}
