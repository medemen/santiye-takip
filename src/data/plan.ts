import type { Rapor } from '../types';
import { DURUM_RENKLERI } from '../config/defaultConfig';
import { todayISO, yerelTarih } from '../utils/helpers';

// Bugun Europe/Istanbul takvimine gore alinir (todayISO) ve yerelTarih ile
// gece yarisi olarak kurulur; boylece makinenin timezone'u (CI'daki UTC dahil)
// sonucu etkilemez.
export function hedefKalanGun(hedefTarih: string): number {
  const bugun = yerelTarih(todayISO());
  // new Date('YYYY-MM-DD') UTC parse eder; yerel kurulum icin ayristir
  const hedef = yerelTarih(hedefTarih);
  return Math.round((hedef.getTime() - bugun.getTime()) / (1000 * 60 * 60 * 24));
}

export function getIlerlemeDurumu(
  rapor: Rapor | null,
  hedefTarih?: string
): { label: string; renk: string } {
  if (rapor?.durum === 'tamamlandi') return { label: 'Tamamlandı', renk: DURUM_RENKLERI.tamamlandi };
  if (rapor?.durum === 'gecikme') return { label: 'Gecikme', renk: DURUM_RENKLERI.gecikme };
  if (hedefTarih) {
    const kalanGun = hedefKalanGun(hedefTarih);
    if (kalanGun < 0) return { label: `Süresi Geçti (${-kalanGun} gün)`, renk: DURUM_RENKLERI.gecikme };
    if (kalanGun === 0) return { label: 'Bugün', renk: DURUM_RENKLERI.planlandi };
    if (kalanGun <= 7) return { label: `⚠ ${kalanGun} gün kaldı`, renk: DURUM_RENKLERI.planlandi };
    return { label: `${kalanGun} gün kaldı`, renk: DURUM_RENKLERI.devam_ediyor };
  }
  if (rapor?.durum === 'devam_ediyor') return { label: 'Devam Ediyor', renk: DURUM_RENKLERI.devam_ediyor };
  if (rapor?.durum === 'planlandi') return { label: 'Planlandı', renk: DURUM_RENKLERI.planlandi };
  return { label: 'Rapor Yok', renk: 'var(--text-subtle)' };
}

export interface HedefOzetItem {
  ada: string;
  blok_no: number;
  is_kalemi: string;
  hedef_tarih: string;
  kalanGun: number;
  rapor: Rapor | null;
  durum: { label: string; renk: string };
}

export interface HedefOzet {
  toplam: number;
  tamamlanan: number;
  geciken: number;
  suresiGecen: number;
  bugun: number;
  yediGun: number;
  acil: HedefOzetItem[];
}

export function getHedefOzeti(
  hedefler: Pick<HedefOzetItem, 'ada' | 'blok_no' | 'is_kalemi' | 'hedef_tarih'>[],
  raporBul: (ada: string, blokNo: number, isKalemi: string) => Rapor | null
): HedefOzet {
  const items: HedefOzetItem[] = hedefler.map((h) => {
    const kalanGun = hedefKalanGun(h.hedef_tarih);
    const rapor = raporBul(h.ada, h.blok_no, h.is_kalemi);
    return { ...h, kalanGun, rapor, durum: getIlerlemeDurumu(rapor, h.hedef_tarih) };
  });
  const aktif = items.filter((i) => i.rapor?.durum !== 'tamamlandi');
  return {
    toplam: items.length,
    tamamlanan: items.length - aktif.length,
    geciken: items.filter((i) => i.rapor?.durum === 'gecikme').length,
    suresiGecen: aktif.filter((i) => i.kalanGun < 0).length,
    bugun: aktif.filter((i) => i.kalanGun === 0).length,
    yediGun: aktif.filter((i) => i.kalanGun > 0 && i.kalanGun <= 7).length,
    acil: aktif
      .filter((i) => i.kalanGun <= 7)
      .sort((a, b) => a.kalanGun - b.kalanGun),
  };
}
