import { describe, expect, it } from 'vitest';
import { adaOzetleri, hedefSatiri, type HedefExportKaynak } from './exportXlsx';
import type { Rapor } from '../types';

describe('adaOzetleri', () => {
  const raporlar: Rapor[] = [
    { id: '1', tarih: '2026-08-01', raporlayan: 'A', ada: 'Ada1', blok_no: 1, is_kalemi: 'Sıva', durum: 'tamamlandi', ilerleme_yuzde: 100, aciklama: '', olusturma_tarihi: '2026-08-01T10:00:00Z', user_id: null },
    { id: '2', tarih: '2026-08-02', raporlayan: 'B', ada: 'Ada1', blok_no: 2, is_kalemi: 'Sıva', durum: 'devam_ediyor', ilerleme_yuzde: 50, aciklama: '', olusturma_tarihi: '2026-08-02T10:00:00Z', user_id: null },
    { id: '3', tarih: '2026-08-03', raporlayan: 'C', ada: 'Ada2', blok_no: 1, is_kalemi: 'Sıva', durum: 'planlandi', ilerleme_yuzde: 0, aciklama: '', olusturma_tarihi: '2026-08-03T10:00:00Z', user_id: null },
  ];

  it('raporlari adalara gore gruplar', () => {
    const sonuc = adaOzetleri(raporlar);
    expect(sonuc).toHaveLength(2);
  });

  it('durum sayimlarini dogru yapar', () => {
    const sonuc = adaOzetleri(raporlar);
    const ada1 = sonuc.find(s => s.Ada === 'Ada1')!;
    expect(ada1['Rapor Sayısı']).toBe(2);
    expect(ada1.Tamamlandı).toBe(1);
    expect(ada1['Devam Ediyor']).toBe(1);
    expect(ada1.Planlandı).toBe(0);
    expect(ada1.Gecikme).toBe(0);
  });

  it('ortalama ilerlemeyi hesaplar', () => {
    const sonuc = adaOzetleri(raporlar);
    const ada1 = sonuc.find(s => s.Ada === 'Ada1')!;
    expect(ada1['Ortalama İlerleme (%)']).toBe(75);
  });

  it('bos dizi dondurur', () => {
    expect(adaOzetleri([])).toHaveLength(0);
  });

  it('ada adina gore siralar', () => {
    const karisik: Rapor[] = [
      { id: '1', tarih: '2026-01-01', raporlayan: 'X', ada: 'Z_Ada', blok_no: 1, is_kalemi: 'K', durum: 'tamamlandi', ilerleme_yuzde: 100, aciklama: '', olusturma_tarihi: '', user_id: null },
      { id: '2', tarih: '2026-01-01', raporlayan: 'Y', ada: 'A_Ada', blok_no: 1, is_kalemi: 'K', durum: 'devam_ediyor', ilerleme_yuzde: 30, aciklama: '', olusturma_tarihi: '', user_id: null },
    ];
    const sonuc = adaOzetleri(karisik);
    expect(sonuc[0].Ada).toBe('A_Ada');
    expect(sonuc[1].Ada).toBe('Z_Ada');
  });
});

describe('hedefSatiri', () => {
  const hedef: HedefExportKaynak = { ada: 'Ada1', blok_no: 2, is_kalemi: 'Sıva', hedef_tarih: '2026-12-31' };

  it('rapor yoksa rapor alanlarini bos birakir', () => {
    const satir = hedefSatiri(hedef, () => null);
    expect(satir['İlerleme (%)']).toBe('');
    expect(satir['Son Rapor Durumu']).toBe('Rapor Yok');
  });

  it('rapor varsa durum ve ilerlemeyi doldurur', () => {
    const mockRapor: Rapor = {
      id: '1', tarih: '2026-08-01', raporlayan: 'A', ada: 'Ada1', blok_no: 2,
      is_kalemi: 'Sıva', durum: 'devam_ediyor', ilerleme_yuzde: 65,
      aciklama: '', olusturma_tarihi: '2026-08-01T10:00:00Z', user_id: null,
    };
    const satir = hedefSatiri(hedef, () => mockRapor);
    expect(satir['İlerleme (%)']).toBe(65);
    expect(satir['Son Rapor Durumu']).toBeTruthy();
  });

  it('tamamlandi durumunda ilerlemeyi 100 gosterir', () => {
    const mockRapor: Rapor = {
      id: '1', tarih: '2026-08-01', raporlayan: 'A', ada: 'Ada1', blok_no: 2,
      is_kalemi: 'Sıva', durum: 'tamamlandi', ilerleme_yuzde: 80,
      aciklama: '', olusturma_tarihi: '2026-08-01T10:00:00Z', user_id: null,
    };
    const satir = hedefSatiri(hedef, () => mockRapor);
    expect(satir['İlerleme (%)']).toBe(100);
  });

  it('blok_no 0 icin Ada Geneli yazar', () => {
    const adaGenelHedef: HedefExportKaynak = { ada: 'Ada1', blok_no: 0, is_kalemi: 'K', hedef_tarih: '2026-12-31' };
    const satir = hedefSatiri(adaGenelHedef, () => null);
    expect(satir['Blok']).toBe('Ada Geneli');
  });
});