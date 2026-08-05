import { useEffect, useSyncExternalStore } from 'react';
import {
  getSiteConfig,
  subscribeSiteConfig,
  loadSiteConfigFromDb,
} from '../config/site';

/**
 * Santiye config'ini React'te okumak icin hook.
 * Uygulama acilisinda DB override'ini bir kez yukler,
 * sonra subscribeSiteConfig ile canli guncellenir.
 */
export function useSiteConfig() {
  const config = useSyncExternalStore(subscribeSiteConfig, getSiteConfig);

  useEffect(() => {
    loadSiteConfigFromDb().catch(() => {
      /* sessiz: offline devam */
    });
  }, []);

  return config;
}
