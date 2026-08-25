import { describe, expect, it } from 'vitest';
import { tumKayitlariGetir } from './listeGetir';

function sayfalıKaynak(sayfalar: number[][], sayfaBoyutu: number) {
  let cagri = 0;
  const istekler: Array<[number, number]> = [];
  return {
    istekler,
    cek: async (bastan: number, kadar: number): Promise<{ data: number[] | null; error: null }> => {
      istekler.push([bastan, kadar]);
      const sayfa = sayfalar[cagri] ?? [];
      cagri += 1;
      // Gercek PostgREST gibi: range disina tasan kayitlar donmez
      return { data: sayfa.slice(0, sayfaBoyutu), error: null };
    },
  };
}

describe('tumKayitlariGetir', () => {
  it('tek sayfada biten kucuk veri seti', async () => {
    const kaynak = sayfalıKaynak([[1, 2, 3]], 10);
    const sonuc = await tumKayitlariGetir(kaynak.cek, { sayfaBoyutu: 10 });
    expect(sonuc).toEqual([1, 2, 3]);
    expect(kaynak.istekler).toEqual([[0, 9]]);
  });

  it('kisa sayfa gelene kadar sayfalara devamer eder', async () => {
    const tam = Array.from({ length: 4 }, (_, i) => i);
    const kaynak = sayfalıKaynak([[...tam], [...tam], [8, 9]], 4);
    const sonuc = await tumKayitlariGetir(kaynak.cek, { sayfaBoyutu: 4 });
    expect(sonuc).toEqual([0, 1, 2, 3, 0, 1, 2, 3, 8, 9]);
    expect(kaynak.istekler).toEqual([
      [0, 3],
      [4, 7],
      [8, 11],
    ]);
  });

  it('bos tablo bos dizi dondurur', async () => {
    const kaynak = sayfalıKaynak([[]], 5);
    const sonuc = await tumKayitlariGetir(kaynak.cek, { sayfaBoyutu: 5 });
    expect(sonuc).toEqual([]);
  });

  it('hata ilk sayfada oldugunda firlatilir', async () => {
    const cek = async (): Promise<{ data: number[] | null; error: { message: string } | null }> =>
      ({ data: null, error: { message: 'RLS ihlali' } });
    await expect(tumKayitlariGetir(cek, { sayfaBoyutu: 10 })).rejects.toThrow('RLS ihlali');
  });

  it('hata orta sayfada oldugunda onceki veri atilir ve firlatilir', async () => {
    const iyi = async (bastan: number): Promise<{ data: number[] | null; error: null }> =>
      ({ data: [bastan], error: null });
    let cagri = 0;
    const karisik = async (bastan: number, _kadar: number) => {
      cagri += 1;
      if (cagri === 2) return { data: null, error: { message: 'timeout' } };
      return iyi(bastan);
    };
    await expect(tumKayitlariGetir(karisik, { sayfaBoyutu: 1 })).rejects.toThrow('timeout');
  });

  it('maksSayfa siniri sonsuz donguyu engeller', async () => {
    // Her zaman dolu sayfa donen bozuk kaynak: cap kurtarir
    const dolu = Array.from({ length: 3 }, (_, i) => i);
    const cek = async (): Promise<{ data: number[] | null; error: null }> =>
      ({ data: dolu, error: null });
    const sonuc = await tumKayitlariGetir(cek, { sayfaBoyutu: 3, maksSayfa: 5 });
    expect(sonuc).toHaveLength(15);
  });
});
