import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getHedefOzeti, getIlerlemeDurumu, hedefKalanGun } from './plan';
import type { Rapor } from '../types';

function rapor(kismi: Partial<Rapor>): Rapor {
  return {
    id: 'r1',
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

describe('hedefKalanGun', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('bugun 0 doner', () => {
    vi.setSystemTime(new Date('2026-08-24T15:00:00+03:00'));
    expect(hedefKalanGun('2026-08-24')).toBe(0);
  });

  it('yarin 1 doner', () => {
    vi.setSystemTime(new Date('2026-08-24T23:00:00+03:00'));
    expect(hedefKalanGun('2026-08-25')).toBe(1);
  });

  it('dun -1 doner', () => {
    vi.setSystemTime(new Date('2026-08-24T01:00:00+03:00'));
    expect(hedefKalanGun('2026-08-23')).toBe(-1);
  });

  it('ay ve yil donumunde tam sayi verir (yuvarlama hatasi olmamali)', () => {
    vi.setSystemTime(new Date('2026-12-31T12:00:00+03:00'));
    expect(hedefKalanGun('2027-01-02')).toBe(2);
    expect(hedefKalanGun('2027-03-01')).toBe(60);
  });
});

describe('getIlerlemeDurumu', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-24T12:00:00+03:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('tamamlandi raporu hedef tarihden bagimsiz olarak kazanir', () => {
    const d = getIlerlemeDurumu(rapor({ durum: 'tamamlandi' }), '2026-01-01');
    expect(d.label).toBe('Tamamlandı');
  });

  it('gecikme raporu gecikme rengiyle isaretlenir', () => {
    const d = getIlerlemeDurumu(rapor({ durum: 'gecikme' }));
    expect(d.label).toBe('Gecikme');
  });

  it('suresi gecmis hedefte gecen gun sayisi pozitif yazilir', () => {
    const d = getIlerlemeDurumu(null, '2026-08-20');
    expect(d.label).toBe('Süresi Geçti (4 gün)');
  });

  it('bugun ve yedi gun icindeki hedef uyarilir', () => {
    expect(getIlerlemeDurumu(null, '2026-08-24').label).toBe('Bugün');
    expect(getIlerlemeDurumu(null, '2026-08-26').label).toContain('2 gün kaldı');
  });

  it('uzak hedef sakin etiketle gelir', () => {
    const d = getIlerlemeDurumu(null, '2026-10-01');
    expect(d.label).toBe('38 gün kaldı');
  });

  it('rapor ve hedef yoksa Rapor Yok', () => {
    expect(getIlerlemeDurumu(null).label).toBe('Rapor Yok');
  });
});

describe('getHedefOzeti', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-24T12:00:00+03:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('tamamlanan/aktif ayrimini dogru yapar', () => {
    const ozet = getHedefOzeti(
      [
        { ada: 'A', blok_no: 1, is_kalemi: 'Sıva', hedef_tarih: '2026-08-20' },
        { ada: 'A', blok_no: 2, is_kalemi: 'Sıva', hedef_tarih: '2026-08-24' },
        { ada: 'A', blok_no: 3, is_kalemi: 'Sıva', hedef_tarih: '2026-08-30' },
      ],
      (_ada, blok) =>
        blok === 1 ? rapor({ durum: 'tamamlandi' }) : blok === 2 ? rapor({ durum: 'devam_ediyor' }) : null
    );
    expect(ozet.toplam).toBe(3);
    expect(ozet.tamamlanan).toBe(1);
    // suresi gecen: tamamlandi olan sayilmaz
    expect(ozet.suresiGecen).toBe(0);
    expect(ozet.bugun).toBe(1);
    expect(ozet.yediGun).toBe(1);
    // acil listesi en yakin hedef once gelecek sekilde artan siralidir
    expect(ozet.acil.map((a) => a.blok_no)).toEqual([2, 3]);
  });

  it('gecikme durumlu rapor geciken sayilir', () => {
    const ozet = getHedefOzeti(
      [{ ada: 'B', blok_no: 1, is_kalemi: 'Boya', hedef_tarih: '2026-08-01' }],
      () => rapor({ durum: 'gecikme', ilerleme_yuzde: 30 })
    );
    expect(ozet.geciken).toBe(1);
  });
});
