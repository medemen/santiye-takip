import type { Rapor } from '../types';

export function getGecikenIsler(raporlar: Rapor[]): Rapor[] {
  return raporlar.filter((r) => r.durum === 'gecikme');
}

export function getPlanlananIsler(raporlar: Rapor[]): Rapor[] {
  return raporlar.filter((r) => r.durum === 'planlandi');
}

export function getIlerlemeDurumu(
  rapor: Rapor | null,
  hedefTarih?: string
): { label: string; renk: string } {
  if (!rapor) return { label: 'Rapor Yok', renk: '#9ca3af' };
  if (rapor.durum === 'tamamlandi') return { label: 'Tamamlandı', renk: '#22c55e' };
  if (rapor.durum === 'gecikme') return { label: 'Gecikme', renk: '#ef4444' };
  if (hedefTarih) {
    const bugun = new Date();
    const hedef = new Date(hedefTarih);
    if (hedef < bugun) return { label: 'Süresi Geçti', renk: '#f59e0b' };
    const kalanGun = Math.ceil((hedef.getTime() - bugun.getTime()) / (1000 * 60 * 60 * 24));
    if (kalanGun <= 7) return { label: `⚠ ${kalanGun} gün kaldı`, renk: '#f59e0b' };
    return { label: `${kalanGun} gün kaldı`, renk: '#3b82f6' };
  }
  if (rapor.durum === 'devam_ediyor') return { label: 'Devam Ediyor', renk: '#3b82f6' };
  if (rapor.durum === 'planlandi') return { label: 'Planlandı', renk: '#f59e0b' };
  return { label: 'Bilinmiyor', renk: '#9ca3af' };
}

export function getAdaProgramOzeti(
  adaRaporlar: Rapor[],
  blokSayisi: number,
  isKalemleri: readonly string[]
): {
  toplamIs: number;
  tamamlanan: number;
  geciken: number;
  devamEden: number;
  planlanan: number;
} {
  const toplamIs = blokSayisi * isKalemleri.length;
  return {
    toplamIs,
    tamamlanan: adaRaporlar.filter((r) => r.durum === 'tamamlandi').length,
    geciken: adaRaporlar.filter((r) => r.durum === 'gecikme').length,
    devamEden: adaRaporlar.filter((r) => r.durum === 'devam_ediyor').length,
    planlanan: adaRaporlar.filter((r) => r.durum === 'planlandi').length,
  };
}
