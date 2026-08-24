import { describe, expect, it } from 'vitest';
import { sunucuHedefleriBirlestir } from './hedefStore';
import type { HedefAnahtari, BekleyenKayit } from './hedefStore';
import type { IsKalemiHedefi } from '../types';

function hedef(ada: string, blokNo: number, kalem: string, tarih: string, id = 1): IsKalemiHedefi {
  return { id, ada, blok_no: blokNo, is_kalemi: kalem, hedef_tarih: tarih };
}

const A1_SIVA = hedef('A', 1, 'Sıva', '2026-09-01', 10);
const A2_BOYA = hedef('A', 2, 'Boya', '2026-09-15', 11);

describe('sunucuHedefleriBirlestir', () => {
  it('bos kuyruklarda sunucu verisi degismeden doner', () => {
    const sonuc = sunucuHedefleriBirlestir([A1_SIVA, A2_BOYA], [], []);
    expect(sonuc).toEqual([A1_SIVA, A2_BOYA]);
  });

  it('bekleyen silme, sunucudaki eslesen satiri dusurur (dirilme engeli)', () => {
    const silme: HedefAnahtari = { ada: 'A', blok_no: 1, is_kalemi: 'Sıva' };
    const sonuc = sunucuHedefleriBirlestir([A1_SIVA, A2_BOYA], [silme], []);
    expect(sonuc).toEqual([A2_BOYA]);
  });

  it('bekleyen kayit, mevcut satirin tarihini ezer (id korunur)', () => {
    const kayit: BekleyenKayit = { ada: 'A', blok_no: 1, is_kalemi: 'Sıva', hedef_tarih: '2026-10-01' };
    const sonuc = sunucuHedefleriBirlestir([A1_SIVA, A2_BOYA], [], [kayit]);
    expect(sonuc).toHaveLength(2);
    expect(sonuc[0]).toEqual({ ...A1_SIVA, hedef_tarih: '2026-10-01' });
    expect(sonuc[0].id).toBe(10);
  });

  it('sunucuda olmayan bekleyen kayit yeni satir olarak eklenir (id=0)', () => {
    const kayit: BekleyenKayit = { ada: 'B', blok_no: 3, is_kalemi: 'Şap', hedef_tarih: '2026-11-01' };
    const sonuc = sunucuHedefleriBirlestir([A1_SIVA], [], [kayit]);
    expect(sonuc).toEqual([
      A1_SIVA,
      { id: 0, ada: 'B', blok_no: 3, is_kalemi: 'Şap', hedef_tarih: '2026-11-01' },
    ]);
  });

  it('silme + kayit birlikte: ayni anahtar once silinip sonra kaydin tarihiyle gelir', () => {
    const silme: HedefAnahtari = { ada: 'A', blok_no: 1, is_kalemi: 'Sıva' };
    const kayit: BekleyenKayit = { ada: 'A', blok_no: 1, is_kalemi: 'Sıva', hedef_tarih: '2026-12-01' };
    const sonuc = sunucuHedefleriBirlestir([A1_SIVA], [silme], [kayit]);
    expect(sonuc).toEqual([{ id: 0, ada: 'A', blok_no: 1, is_kalemi: 'Sıva', hedef_tarih: '2026-12-01' }]);
  });

  it('girdi dizilerini mutasyona ugratmaz', () => {
    const sunucu = [A1_SIVA];
    const kayitlar: BekleyenKayit[] = [
      { ada: 'B', blok_no: 1, is_kalemi: 'X', hedef_tarih: '2026-01-01' },
    ];
    sunucuHedefleriBirlestir(sunucu, [], kayitlar);
    expect(sunucu).toEqual([A1_SIVA]);
  });
});
