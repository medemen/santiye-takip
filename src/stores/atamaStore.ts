import type { KullaniciAtamalari, BlokAtamasi } from '../types';
import { getSupabase, isSupabaseReady } from '../lib/supabase';
import { getSiteConfig } from '../config/site';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toastGoster } from './toastStore';
import { getCurrentUser, supabaseOturumAktif } from './authStore';

const PREFIX = getSiteConfig().marka.localStoragePrefix;
const BLOK_KEY = `${PREFIX}_blok_atamalari`;
const ADA_KEY = `${PREFIX}_ada_atamalari`;

let _adaChannel: RealtimeChannel | null = null;
let _blokChannel: RealtimeChannel | null = null;

export function aboneOlAtamaGuncellemeleri(onChannelStatus?: (status: string) => void): void {
  if (!supabaseOturumAktif()) return;

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

// modul seviyesi cache: her okumada JSON.parse yapilmaz
let _blokAtamalarCache: KullaniciAtamalari | null = null;
let _adaAtamalarCache: Record<string, string | null> | null = null;

function getBlokAtamalar(): KullaniciAtamalari {
  if (_blokAtamalarCache) return _blokAtamalarCache;
  let okunan: KullaniciAtamalari;
  try {
    const data = localStorage.getItem(BLOK_KEY);
    okunan = data ? JSON.parse(data) : {};
  } catch {
    okunan = {};
  }
  _blokAtamalarCache = okunan;
  return okunan;
}

function saveBlokAtamalar(atamalar: KullaniciAtamalari): void {
  _blokAtamalarCache = atamalar;
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
  if (supabaseOturumAktif()) {
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
  if (_adaAtamalarCache) return _adaAtamalarCache;
  let okunan: Record<string, string | null>;
  try {
    const data = localStorage.getItem(ADA_KEY);
    okunan = data ? JSON.parse(data) : {};
  } catch {
    okunan = {};
  }
  _adaAtamalarCache = okunan;
  return okunan;
}

function saveAdaAtamalar(atamalar: Record<string, string | null>): void {
  _adaAtamalarCache = atamalar;
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
  if (supabaseOturumAktif()) {
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
      .select('ad_soyad, ada');
    if (adaError) throw adaError;

    const yerelAda = getAdaAtamalar();
    const sunucuAda: Record<string, string | null> = {};
    for (const row of adaRows ?? []) {
      sunucuAda[row.ad_soyad] = row.ada;
    }
    saveAdaAtamalar({ ...yerelAda, ...sunucuAda });

    const bekleyenAda = Object.entries(yerelAda).filter(([ad]) => !(ad in sunucuAda));
    if (supabaseOturumAktif()) {
      for (const [ad, ada] of bekleyenAda) {
        const { error } = await getSupabase()
          .from('kullanici_ada_atamalari')
          .upsert({ ad_soyad: ad, ada, updated_at: new Date().toISOString(), user_id: getCurrentUser()?.user_id ?? null }, { onConflict: 'ad_soyad' });
        if (error) {
          console.warn('Supabase yerel ada atama yükleme hatası:', error.message);
          toastGoster('Yerel ada atamaları sunucuya yüklenemedi: ' + error.message, 'error');
        }
      }
    }

    const { data: blokRows, error: blokError } = await getSupabase()
      .from('kullanici_blok_atamalari')
      .select('ad_soyad, ada, blok_nos');
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
    if (bekleyenBlok.length > 0 && supabaseOturumAktif()) {
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
