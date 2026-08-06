import { getSupabase, isSupabaseReady } from '../lib/supabase';
import { getSiteConfig } from '../config/site';
import { toastGoster } from './toastStore';

const BUCKET = 'rapor_fotograflar';
const STORAGE_KEY = `${getSiteConfig().marka.localStoragePrefix}_rapor_fotograflar`;

// yerel cache: raporId -> dosya_yolu[]
type FotoHarita = Record<string, string[]>;

type Listener = () => void;
const _fotoListeners = new Set<Listener>();
let _fotoVersion = 0;

function notifyFotoListeners(): void {
  _fotoVersion++;
  _fotoListeners.forEach((fn) => fn());
}

export function getFotoVersion(): number {
  return _fotoVersion;
}

export function subscribeFotoChanges(listener: Listener): () => void {
  _fotoListeners.add(listener);
  return () => { _fotoListeners.delete(listener); };
}

function getHarita(): FotoHarita {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function setHarita(harita: FotoHarita): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(harita));
  notifyFotoListeners();
}

function dosyaUzantisi(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? 'jpg';
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'jpg';
}

export function fotoYoluPublic(dosya_yolu: string): string {
  if (!isSupabaseReady()) return '';
  return getSupabase().storage.from(BUCKET).getPublicUrl(dosya_yolu).data.publicUrl;
}

export function getRaporFotolari(raporId: string): string[] {
  return getHarita()[raporId] ?? [];
}

export function getRaporFotoUrl(raporId: string): string | null {
  const yollar = getRaporFotolari(raporId);
  if (yollar.length === 0) return null;
  return fotoYoluPublic(yollar[0]);
}

export function getRaporFotoSayisi(raporId: string): number {
  return getRaporFotolari(raporId).length;
}

export async function supabaseFotolariYukle(): Promise<void> {
  if (!isSupabaseReady()) return;
  try {
    const { data, error } = await getSupabase()
      .from('rapor_fotograflar')
      .select('rapor_id, dosya_yolu');
    if (error) throw error;
    const harita: FotoHarita = {};
    for (const row of data ?? []) {
      (harita[row.rapor_id] ??= []).push(row.dosya_yolu);
    }
    const mevcut = getHarita();
    const birlesik = { ...mevcut, ...harita };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(birlesik));
    notifyFotoListeners();
  } catch {
    /* offline, yerel cache ile devam */
  }
}

export function fotolariKaydet(raporId: string, yollar: string[]): void {
  const harita = getHarita();
  const mevcut = new Set(harita[raporId] ?? []);
  yollar.forEach((y) => mevcut.add(y));
  harita[raporId] = [...mevcut];
  setHarita(harita);
}

export function fotolariSil(raporId: string, yollar?: string[]): void {
  const harita = getHarita();
  if (!yollar || yollar.length === 0) {
    delete harita[raporId];
    setHarita(harita);
    return;
  }
  const kalan = (harita[raporId] ?? []).filter((y) => !yollar.includes(y));
  if (kalan.length === 0) delete harita[raporId];
  else harita[raporId] = kalan;
  setHarita(harita);
}

export async function yukleFotolar(
  raporId: string,
  files: File[],
): Promise<string[]> {
  if (files.length === 0) return [];
  if (!isSupabaseReady()) {
    toastGoster('Fotoğraf yüklemek için internet gerekli', 'error');
    return [];
  }

  const sb = getSupabase();
  const yuklenenYollar: string[] = [];
  let basarisiz = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = dosyaUzantisi(file.name);
    const yol = `${raporId}/${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await sb.storage
      .from(BUCKET)
      .upload(yol, file, { contentType: file.type || 'image/jpeg' });
    if (uploadError) {
      basarisiz++;
      continue;
    }

    const { error: rowError } = await sb
      .from('rapor_fotograflar')
      .insert({ rapor_id: raporId, dosya_yolu: yol });
    if (rowError) {
      // satır eklenemezse dosyayı da temizle
      await sb.storage.from(BUCKET).remove([yol]);
      basarisiz++;
      continue;
    }

    yuklenenYollar.push(yol);
  }

  if (yuklenenYollar.length > 0) {
    fotolariKaydet(raporId, yuklenenYollar);
  }
  if (basarisiz > 0) {
    toastGoster(`${basarisiz} fotoğraf yüklenemedi`, 'error');
  }
  return yuklenenYollar;
}

export async function sunucudanFotolariSil(raporId: string, yollar?: string[]): Promise<void> {
  fotolariSil(raporId, yollar);
  if (!isSupabaseReady()) return;
  const sb = getSupabase();

  const query = sb.from('rapor_fotograflar').delete().eq('rapor_id', raporId);
  const { error } = await query;
  if (error) {
    console.warn('Supabase rapor fotoğrafı satır silme hatası:', error.message);
  }

  if (yollar && yollar.length > 0) {
    const { error: storageError } = await sb.storage.from(BUCKET).remove(yollar);
    if (storageError) {
      console.warn('Supabase fotoğraf dosyası silme hatası:', storageError.message);
    }
  }
}
