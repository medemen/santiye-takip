import { describe, expect, it } from 'vitest';
import { adaDurumSayilari, BOS_ADA_SAYISI, durumDonutVerisi } from './istatistik';
import type { Rapor } from '../types';

function rapor(kismi: Partial<Rapor>): Rapor {
  return {
    id: kismi.id ?? 'r-' + Math.random().toString(36).slice(2),
    tarih: '2026-08-24',
    raporlayan: 'Test Kullanici',
    ada: 'A',
    blok_no: 1,
    is_kalemi: 'Sıva',
    durum: 'devam_ediyor',
    ilerleme_yuzde: 50,
    aciklama: '',
    olusturma_tarihi: new Date().toISOString(),
    ...kismi,
  } as Rapor;
}

describe('adaDurumSayilari', () => {
  it('durumlari ada bazinda sayar', () => {
    const harita = adaDurumSayilari([
      rapor({ ada: 'A', durum: 'tamamlandi' }),
      rapor({ ada: 'A', durum: 'devam_ediyor' }),
      rapor({ ada: 'A', durum: 'gecikme' }),
      rapor({ ada: 'B', durum: 'planlandi' }),
    ]);
    expect(harita.get('A')).toEqual({ toplam: 3, tamam: 1, devam: 1, gecikme: 1, plan: 0 });
    expect(harita.get('B')).toEqual({ toplam: 1, tamam: 0, devam: 0, gecikme: 0, plan: 1 });
  });

  it('bilinmeyen durum toplamda sayilir ama kategorize edilmez', () => {
    const harita = adaDurumSayilari([rapor({ ada: 'C', durum: 'tuhaf' as never })]);
    expect(harita.get('C')!.toplam).toBe(1);
    expect(harita.get('C')!.tamam + harita.get('C')!.devam + harita.get('C')!.gecikme + harita.get('C')!.plan).toBe(0);
  });

  it('bos liste bos harita doner', () => {
    expect(adaDurumSayilari([]).size).toBe(0);
  });

  it('BOS_ADA_SAYISI sifirlarla baslar', () => {
    expect(BOS_ADA_SAYISI).toEqual({ toplam: 0, tamam: 0, devam: 0, gecikme: 0, plan: 0 });
  });
});

describe('durumDonutVerisi', () => {
  it('dort dilimi DURUM_RENKLERI ile uretir', () => {
    const dilimler = durumDonutVerisi({
      tamamlananIsler: 4,
      devamEdenIsler: 2,
      planlananIsler: 1,
      gecikenIsler: 0,
    });
    expect(dilimler.map((d) => d.name)).toEqual(['Tamamlandı', 'Devam Ediyor', 'Planlandı', 'Gecikme']);
    expect(dilimler.map((d) => d.value)).toEqual([4, 2, 1, 0]);
    expect(new Set(dilimler.map((d) => d.color)).size).toBe(4);
  });
});
