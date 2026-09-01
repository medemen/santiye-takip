import type { Rapor, IsDurumu } from '../types';

export interface GirilecekOge {
  ada: string;
  is_kalemi: string;
  sonTarih: string;
  sonIlerleme: number;
  durum: IsDurumu;
}

// "Bugun" giris yapilmamistir: bir (ada, is kalemi) kombinasyonunun son raporu
// bugune degilse ve is tamamlanmamissa guncelleme kaldi demektir. Aktif islerin
// girisini atlamamak icin dashboard'a cekilen bir onerilistesi.
// Kapsam: yalnizca hic raporu olmayan kombinasyonlari atlar (henuz giris yok).
export function bugunGirilecekler(
  raporlar: Rapor[],
  adalar: { ada: string; bloklar: { blok_no: number }[] }[],
  isKalemleri: string[],
  bugunIso: string,
  limit = 6
): GirilecekOge[] {
  const sonRapor = new Map<string, Rapor>();
  for (const r of raporlar) {
    if (r.raporlayan === 'DURUM TESPİT') continue;
    const anahtar = `${r.ada}|${r.is_kalemi}|${r.blok_no}`;
    const mevcut = sonRapor.get(anahtar);
    if (!mevcut || new Date(r.olusturma_tarihi).getTime() > new Date(mevcut.olusturma_tarihi).getTime()) {
      sonRapor.set(anahtar, r);
    }
  }

  const ogeHaritasi = new Map<string, GirilecekOge>();
  for (const a of adalar) {
    for (const ik of isKalemleri) {
      const blokRaporlari = a.bloklar
        .map((b) => sonRapor.get(`${a.ada}|${ik}|${b.blok_no}`))
        .filter((r): r is Rapor => !!r);

      const adaGenel = sonRapor.get(`${a.ada}|${ik}|0`);
      const havuz = [...blokRaporlari, ...(adaGenel ? [adaGenel] : [])];

      if (havuz.length === 0) continue;

      const enYeni = [...havuz].sort(
        (x, y) => new Date(y.olusturma_tarihi).getTime() - new Date(x.olusturma_tarihi).getTime()
      )[0];

      const tumuTamam = havuz.every((r) => r.durum === 'tamamlandi');
      const bugunGirildi = enYeni.tarih === bugunIso;
      if (tumuTamam || bugunGirildi) continue;

      ogeHaritasi.set(`${a.ada}|${ik}`, {
        ada: a.ada,
        is_kalemi: ik,
        sonTarih: enYeni.tarih,
        sonIlerleme: enYeni.ilerleme_yuzde,
        durum: enYeni.durum,
      });
    }
  }

  return Array.from(ogeHaritasi.values())
    .sort((x, y) => (x.sonTarih < y.sonTarih ? -1 : x.sonTarih > y.sonTarih ? 1 : 0))
    .slice(0, limit);
}
