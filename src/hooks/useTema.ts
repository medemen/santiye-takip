import { useSyncExternalStore } from 'react';
import { getTemaSecim, getTemaVersion, getTemaTema, setTemaSecim, subscribeTemaChanges, type TemaSecim } from '../stores/themeStore';

export function useTema(): { secim: TemaSecim; tema: 'light' | 'dark'; setSecim: (s: TemaSecim) => void } {
  useSyncExternalStore(subscribeTemaChanges, getTemaVersion);
  return {
    secim: getTemaSecim(),
    tema: getTemaTema(),
    setSecim: setTemaSecim,
  };
}
