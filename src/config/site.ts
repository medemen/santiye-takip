import { DEFAULT_CONFIG } from './defaultConfig';
import type { SantiyeConfig } from './types';

/**
 * Santiye config'i icin runtime erisim katmani.
 *
 * Oncelik sirasi:
 *   1. Varsayilan (bundle icindeki data/santiye.config.json)
 *   2. localStorage override'i (admin paneli duzenlemeleri, offline)
 *   3. Supabase `santiye_config` tablosu (tum cihazlara yayilir)
 *
 * Degisiklikler `subscribeSiteConfig` ile dinlenebilir (bkz. useSiteConfig).
 */

const STORAGE_KEY = `${DEFAULT_CONFIG.marka.localStoragePrefix}_config_override`;

let current: SantiyeConfig = DEFAULT_CONFIG;
const listeners = new Set<(cfg: SantiyeConfig) => void>();

function deepMerge<T>(base: T, override: unknown): T {
  if (Array.isArray(base)) return override as T;
  if (base && typeof base === 'object' && override && typeof override === 'object') {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const key of Object.keys(override as Record<string, unknown>)) {
      const ov = (override as Record<string, unknown>)[key];
      const bv = (out as Record<string, unknown>)[key];
      out[key] = deepMerge(bv, ov);
    }
    return out as T;
  }
  return (override ?? base) as T;
}

export function getSiteConfig(): SantiyeConfig {
  return current;
}

export function setSiteConfig(
  next: SantiyeConfig,
  options?: { persistLocal?: boolean; persistDb?: boolean }
): void {
  current = deepMerge(DEFAULT_CONFIG, next);
  if (options?.persistLocal) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* localStorage kapali olabilir */
    }
  }
  listeners.forEach((fn) => fn(current));
}

export function resetSiteConfig(options?: { persistDb?: boolean }): void {
  current = DEFAULT_CONFIG;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* yok say */
  }
  if (options?.persistDb) {
    // eslint-disable-next-line no-void
    void persistConfigToDb(DEFAULT_CONFIG);
  }
  listeners.forEach((fn) => fn(current));
}

export function subscribeSiteConfig(fn: (cfg: SantiyeConfig) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Bilesen mount sayisi kadar supabase sorgusu atilmamasi icin
// "zaten yuklendi" bayragi + in-flight promise dedup.
let _configYuklendi = false;
let _configYuklemePromise: Promise<SantiyeConfig> | null = null;

export async function loadSiteConfigFromDb(): Promise<SantiyeConfig> {
  if (_configYuklendi) return current;
  if (_configYuklemePromise) return _configYuklemePromise;

  _configYuklemePromise = configiDbdenYukle().finally(() => {
    _configYuklemePromise = null;
  });
  return _configYuklemePromise;
}

async function configiDbdenYukle(): Promise<SantiyeConfig> {
  let merged: SantiyeConfig | null = null;

  // localStorage override onceliklidir
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      merged = deepMerge(DEFAULT_CONFIG, JSON.parse(raw));
    }
  } catch {
    /* bozuk json yok sayilir */
  }

  // Supabase tablosu varsa ustune islenir
  const { getSupabase, isSupabaseReady } = await import('../lib/supabase');
  let dbBasarili = false;
  if (isSupabaseReady()) {
    try {
      const { data, error } = await getSupabase()
        .from('santiye_config')
        .select('config, updated_at')
        .eq('id', 1)
        .single();
      if (!error && data?.config) {
        merged = deepMerge(merged ?? DEFAULT_CONFIG, data.config);
        if (!merged.durumTespit && data.config.durumTespit) {
          merged = deepMerge(DEFAULT_CONFIG, data.config);
        }
        dbBasarili = true;
      }
    } catch {
      /* DB'ye ulasilamadiysa cached/devam et */
    }
  }

  if (merged) setSiteConfig(merged);
  if (dbBasarili) _configYuklendi = true;
  return current;
}

export async function persistConfigToDb(cfg: SantiyeConfig): Promise<void> {
  const { getSupabase, isSupabaseReady } = await import('../lib/supabase');
  if (!isSupabaseReady()) return;
  const { supabaseOturumAktif } = await import('../stores/authStore');
  if (!supabaseOturumAktif()) return;
  const { error } = await getSupabase()
    .from('santiye_config')
    .upsert(
      { id: 1, config: cfg, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
  if (error) throw error;
}
