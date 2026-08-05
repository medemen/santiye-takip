import { useSyncExternalStore } from 'react';
import type { IsKalemiHedefi } from '../types';
import { getHedefler, subscribeHedefChanges, getHedefVersion } from '../stores/hedefStore';

export function useHedefler(): IsKalemiHedefi[] {
  useSyncExternalStore(subscribeHedefChanges, getHedefVersion);
  return getHedefler();
}
