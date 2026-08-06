import type { Rapor } from '../types';
import { DURUM_LABELLARI } from '../config/defaultConfig';
import { hedefKalanGun } from '../data/plan';

export interface HedefExportKaynak {
  ada: string;
  blok_no: number;
  is_kalemi: string;
  hedef_tarih: string;
}

function hedefSatiri(
  h: HedefExportKaynak,
  raporBul: (ada: string, blokNo: number, isKalemi: string) => Rapor | null
): Record<string, string | number> {
  const rapor = raporBul(h.ada, h.blok_no, h.is_kalemi);
  const kalanGun = hedefKalanGun(h.hedef_tarih);
  let durum = `${kalanGun} gün`;
  if (kalanGun < 0) durum = `Süresi geçti (${-kalanGun} gün)`;
  if (kalanGun === 0) durum = 'Bugün';
  if (rapor?.durum === 'tamamlandi') durum = 'Tamamlandı';
  return {
    'Ada': h.ada,
    'Blok': h.blok_no === 0 ? 'Ada Geneli' : h.blok_no,
    'İş Kalemi': h.is_kalemi,
    'Hedef Tarih': h.hedef_tarih,
    'Kalan Gün': kalanGun,
    'Durum': durum,
    'İlerleme (%)': rapor?.ilerleme_yuzde ?? '',
    'Son Rapor Durumu': rapor ? DURUM_LABELLARI[rapor.durum] || rapor.durum : 'Rapor Yok',
  };
}

export async function hedeflerXlsxExport(
  hedefler: HedefExportKaynak[],
  raporBul: (ada: string, blokNo: number, isKalemi: string) => Rapor | null,
  dosyaAdi = 'hedef-takvimi.xlsx'
): Promise<void> {
  const XLSX = await import('xlsx');
  const satirlar = hedefler
    .slice()
    .sort((a, b) => a.hedef_tarih.localeCompare(b.hedef_tarih))
    .map((h) => hedefSatiri(h, raporBul));

  const ws = XLSX.utils.json_to_sheet(satirlar);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hedef Takvimi');

  ws['!cols'] = [
    { wch: 8 }, { wch: 10 }, { wch: 26 }, { wch: 12 },
    { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 16 },
  ];

  XLSX.writeFile(wb, dosyaAdi);
}

export async function raporlarXlsxExport(
  raporlar: Rapor[],
  dosyaAdi = 'raporlar.xlsx',
  hedefBul?: (ada: string, blokNo: number, isKalemi: string) => { hedef_tarih: string } | undefined
): Promise<void> {
  const XLSX = await import('xlsx');
  const data = raporlar.map((r) => {
    const hedef = hedefBul?.(r.ada, r.blok_no, r.is_kalemi);
    const satir: Record<string, string | number> = {
      'Ada': r.ada,
      'Blok': r.blok_no,
      'İş Kalemi': r.is_kalemi,
      'Durum': DURUM_LABELLARI[r.durum] || r.durum,
      'İlerleme (%)': r.ilerleme_yuzde,
      'Tarih': r.tarih,
      'Raporlayan': r.raporlayan,
      'Açıklama': r.aciklama,
      'Oluşturma': r.olusturma_tarihi,
    };
    if (hedef) {
      const kalanGun = hedefKalanGun(hedef.hedef_tarih);
      satir['Hedef Tarih'] = hedef.hedef_tarih;
      satir['Hedefe Kalan Gün'] = kalanGun;
      if (r.durum !== 'tamamlandi' && kalanGun < 0) satir['Durum'] = 'GECİKMİŞ';
    }
    return satir;
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Raporlar');

  ws['!cols'] = [
    { wch: 8 }, { wch: 6 }, { wch: 18 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 40 }, { wch: 22 },
    { wch: 12 }, { wch: 14 },
  ];

  XLSX.writeFile(wb, dosyaAdi);
}
