import type { Rapor } from '../types';
import { DURUM_RENKLERI } from '../config/defaultConfig';

export interface AdaDurumSayisi {
  toplam: number;
  tamam: number;
  devam: number;
  gecikme: number;
  plan: number;
}

export const BOS_ADA_SAYISI: AdaDurumSayisi = { toplam: 0, tamam: 0, devam: 0, gecikme: 0, plan: 0 };

// Raporlari ada bazinda durum sayilarina indirger (Dashboard + Statistics
// ayni kaynagi kullanir; ayni ada iki ekranda farkli sayi vermesin).
export function adaDurumSayilari(raporlar: Rapor[]): Map<string, AdaDurumSayisi> {
  const sayilar = new Map<string, AdaDurumSayisi>();
  for (const r of raporlar) {
    let s = sayilar.get(r.ada);
    if (!s) {
      s = { ...BOS_ADA_SAYISI };
      sayilar.set(r.ada, s);
    }
    s.toplam++;
    if (r.durum === 'tamamlandi') s.tamam++;
    else if (r.durum === 'devam_ediyor') s.devam++;
    else if (r.durum === 'gecikme') s.gecikme++;
    else if (r.durum === 'planlandi') s.plan++;
  }
  return sayilar;
}

export interface DonutDilim {
  name: string;
  value: number;
  color: string;
}

export function durumDonutVerisi(sayilar: {
  tamamlananIsler: number;
  devamEdenIsler: number;
  planlananIsler: number;
  gecikenIsler: number;
}): DonutDilim[] {
  return [
    { name: 'Tamamlandı', value: sayilar.tamamlananIsler, color: DURUM_RENKLERI.tamamlandi },
    { name: 'Devam Ediyor', value: sayilar.devamEdenIsler, color: DURUM_RENKLERI.devam_ediyor },
    { name: 'Planlandı', value: sayilar.planlananIsler, color: DURUM_RENKLERI.planlandi },
    { name: 'Gecikme', value: sayilar.gecikenIsler, color: DURUM_RENKLERI.gecikme },
  ];
}
