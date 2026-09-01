import { describe, expect, it } from 'vitest';
import { bugunGirilecekler } from './bugunGirilecek';
import type { Rapor } from '../types';

let sira = 0;
function rapor(kismi: Partial<Rapor>): Rapor {
  sira += 1;
  return {
    id: `r${sira}`,
    user_id: 'u1',
    tarih: '2026-08-25',
    raporlayan: 'Ali',
    ada: 'A',
    blok_no: 1,
    is_kalemi: 'Sıva',
    durum: 'devam_ediyor',
    ilerleme_yuzde: 40,
    aciklama: '',
    olusturma_tarihi: `2026-08-25T09:00:00.000+03:00`,
    onay_durumu: 'onaylandi',
    revizyon_notu: '',
    fotograflar: [],
    ...kismi,
  } as Rapor;
}

const adalar = [
  { ada: 'A', bloklar: [{ blok_no: 1 }, { blok_no: 2 }] },
  { ada: 'B', bloklar: [{ blok_no: 1 }] },
];

describe('bugunGirilecekler', () => {
  it('bugun hic giris yoksa tum aktif kombinasyonlar one cikar', () => {
    const raporlar = [
      rapor({ ada: 'A', blok_no: 1, is_kalemi: 'Sıva', tarih: '2026-08-24' }),
    ];
    const sonuc = bugunGirilecekler(raporlar, adalar, ['Sıva'], '2026-08-25');
    expect(sonuc.some((o) => o.ada === 'A' && o.is_kalemi === 'Sıva')).toBe(true);
  });

  it('bugun girilen kombinasyon one cikmaz', () => {
    const raporlar = [
      rapor({ ada: 'A', blok_no: 1, is_kalemi: 'Sıva', tarih: '2026-08-25' }),
    ];
    const sonuc = bugunGirilecekler(raporlar, adalar, ['Sıva'], '2026-08-25');
    expect(sonuc.some((o) => o.ada === 'A' && o.is_kalemi === 'Sıva')).toBe(false);
  });

  it('tamamlanan isler one cikmaz', () => {
    const raporlar = [
      rapor({ ada: 'A', blok_no: 1, is_kalemi: 'Boya', tarih: '2026-08-20', durum: 'tamamlandi', ilerleme_yuzde: 100 }),
    ];
    const sonuc = bugunGirilecekler(raporlar, adalar, ['Boya'], '2026-08-25');
    expect(sonuc.some((o) => o.ada === 'A' && o.is_kalemi === 'Boya')).toBe(false);
  });

  it('hiç raporu olmayan kombinasyon one cikmaz (henuz giris yok)', () => {
    const sonuc = bugunGirilecekler([], adalar, ['Kalorifer'], '2026-08-25');
    expect(sonuc.some((o) => o.is_kalemi === 'Kalorifer')).toBe(false);
  });

  it('DURUM TESPIT sistem raporlari "bugun girildi" sayilmaz', () => {
    const raporlar = [
      rapor({ ada: 'A', blok_no: 1, is_kalemi: 'Sıva', tarih: '2026-08-24' }),
      rapor({ ada: 'A', blok_no: 1, is_kalemi: 'Sıva', tarih: '2026-08-25', raporlayan: 'DURUM TESPİT' }),
    ];
    const sonuc = bugunGirilecekler(raporlar, adalar, ['Sıva'], '2026-08-25');
    expect(sonuc.some((o) => o.ada === 'A' && o.is_kalemi === 'Sıva')).toBe(true);
  });

  it('limit ile siralanip kesilir (en eski tarih once)', () => {
    const r1 = rapor({ ada: 'A', blok_no: 1, is_kalemi: 'Sıva', tarih: '2026-08-20' });
    const r2 = rapor({ ada: 'B', blok_no: 1, is_kalemi: 'Sıva', tarih: '2026-08-24' });
    const sonuc = bugunGirilecekler([r1, r2], adalar, ['Sıva', 'Boya'], '2026-08-25', 1);
    expect(sonuc.length).toBe(1);
    expect(sonuc[0].sonTarih).toBe('2026-08-20');
  });
});
