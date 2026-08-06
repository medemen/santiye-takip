import { useSyncExternalStore } from 'react';
import type { Rapor } from '../types';
import { getRaporlar, subscribeRaporChanges, getRaporVersion } from '../stores/reportStore';

export function useRaporlar(): Rapor[] {
  useSyncExternalStore(subscribeRaporChanges, getRaporVersion);
  return getRaporlar();
}
