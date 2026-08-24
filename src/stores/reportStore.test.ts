import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAdaGenelIlerleme,
  getBlokGenelIlerleme,
  getBlokProgress,
  getGenelIlerleme,
  getSonRaporHaritasi,
  raporEtkinYuzde,
  saveRapor,
} from './reportStore';
import type { Rapor } from '../types';

let sayaç = 0;

function kaydet(kismi: Partial<Rapor>): Rapor {
  sayaç += 1;
  // saveRapor kendi id/olusturma_tarihi'sini basar; siralama cagri sirasidir
  return saveRapor({
    tarih: '2026-08-24',
    raporlayan: 'Test Kullanici',
    ada: 'A',
    blok_no: 1,
    is_kalemi: 'Sıva',
    durum: 'devam_ediyor',
    ilerleme_yuzde: 50,
    aciklama: '',
    ...kismi,
  } as Omit<Rapor, 'id' | 'olusturma_tarihi'>);
}

beforeEach(() => {
  localStorage.clear();
});

describe('raporEtkinYuzde', () => {
  it('tamamlandi daima 100', () => {
    expect(raporEtkinYuzde({ durum: 'tamamlandi', ilerleme_yuzde: 40 } as Rapor)).toBe(100);
  });

  it('planlandi daima 0 (eski yuzde sisme yapmamali)', () => {
    expect(raporEtkinYuzde({ durum: 'planlandi', ilerleme_yuzde: 90 } as Rapor)).toBe(0);
  });

  it('devam eden kayitta kayitli yuzde kullanilir', () => {
    expect(raporEtkinYuzde({ durum: 'devam_ediyor', ilerleme_yuzde: 55 } as Rapor)).toBe(55);
    expect(raporEtkinYuzde({ durum: 'gecikme', ilerleme_yuzde: 30 } as Rapor)).toBe(30);
  });

  it('bos/bozuk kayit ve NaN guvenli', () => {
    expect(raporEtkinYuzde(null)).toBe(0);
    expect(raporEtkinYuzde(undefined)).toBe(0);
    expect(raporEtkinYuzde({ durum: 'devam_ediyor', ilerleme_yuzde: Number.NaN } as unknown as Rapor)).toBe(0);
  });
});

describe('getBlokProgress devralma', () => {
  it('blok ozel raporu ada genelini ezer', () => {
    kaydet({ ada: 'A', blok_no: 0, is_kalemi: 'Sıva', ilerleme_yuzde: 10 });
    kaydet({ ada: 'A', blok_no: 3, is_kalemi: 'Sıva', ilerleme_yuzde: 80 });
    const p = getBlokProgress('A', 3, ['Sıva']);
    expect(raporEtkinYuzde(p['Sıva'])).toBe(80);
  });

  it("blok ozel raporu yoksa ada genelinden (blok_no=0) devralir", () => {
    kaydet({ ada: 'A', blok_no: 0, is_kalemi: 'Boya', ilerleme_yuzde: 45 });
    const p = getBlokProgress('A', 5, ['Boya']);
    expect(raporEtkinYuzde(p['Boya'])).toBe(45);
  });

  it('ada geneli satirlari kendisi devralmaz', () => {
    kaydet({ ada: 'A', blok_no: 0, is_kalemi: 'Boya', ilerleme_yuzde: 45 });
    const p = getBlokProgress('A', 0, ['Boya']);
    // blok 0 icin ada-genel anahtari zaten kendisidir; ezme yok
    expect(raporEtkinYuzde(p['Boya'])).toBe(45);
  });

  it('hic rapor yoksa null doner', () => {
    const p = getBlokProgress('Z', 9, ['Sıva']);
    expect(p['Sıva']).toBeNull();
  });
});

describe('tek yuvarlama zinciri', () => {
  it('ada ortalamasi ham degerden hesaplanir; blok yuvarlamalari birikmez', () => {
    const kalemler = ['K1', 'K2'];
    // b1 ham = (0 + 51) / 2 = 25.5 -> gosterimde 26
    kaydet({ ada: 'Y', blok_no: 1, is_kalemi: 'K1', ilerleme_yuzde: 0 });
    kaydet({ ada: 'Y', blok_no: 1, is_kalemi: 'K2', ilerleme_yuzde: 51 });
    // b2 ham = (52 + 1) / 2 = 26.5 -> gosterimde 27
    kaydet({ ada: 'Y', blok_no: 2, is_kalemi: 'K1', ilerleme_yuzde: 52 });
    kaydet({ ada: 'Y', blok_no: 2, is_kalemi: 'K2', ilerleme_yuzde: 1 });

    expect(getBlokGenelIlerleme('Y', 1, kalemler)).toBe(26);
    expect(getBlokGenelIlerleme('Y', 2, kalemler)).toBe(27);

    // ham ortalama (25.5 + 26.5) / 2 = 26 -> 26; yuvarlanmislarla 26.5 -> 27 olurdu
    expect(getAdaGenelIlerleme('Y', [{ blok_no: 1 }, { blok_no: 2 }], kalemler)).toBe(26);
  });

  it('proje geneli ada ortalamasinin ortalamasidir', () => {
    kaydet({ ada: 'P1', blok_no: 0, is_kalemi: 'Tek', durum: 'tamamlandi' });
    kaydet({ ada: 'P2', blok_no: 0, is_kalemi: 'Tek', durum: 'planlandi' });
    const genel = getGenelIlerleme(
      [
        { ada: 'P1', bloklar: [{ blok_no: 0 }] },
        { ada: 'P2', bloklar: [{ blok_no: 0 }] },
      ],
      ['Tek']
    );
    expect(genel).toBe(50);
  });
});

describe('getSonRaporHaritasi', () => {
  it('ayni anahtarda en yeni raporu tutar', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 7, 1, 9, 0, 0));
      kaydet({ ada: 'S', blok_no: 2, is_kalemi: 'Sıva', ilerleme_yuzde: 20 });
      vi.setSystemTime(new Date(2026, 7, 20, 9, 0, 0));
      kaydet({ ada: 'S', blok_no: 2, is_kalemi: 'Sıva', ilerleme_yuzde: 70 });
      const harita = getSonRaporHaritasi();
      const son = harita.get('S|2|Sıva');
      expect(son && raporEtkinYuzde(son)).toBe(70);
    } finally {
      vi.useRealTimers();
    }
  });
});
