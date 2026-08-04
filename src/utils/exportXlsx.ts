import type { Rapor } from '../types';
import { DURUM_LABELLARI } from '../data/isKalemleri';

export async function raporlarXlsxExport(raporlar: Rapor[], dosyaAdi = 'raporlar.xlsx'): Promise<void> {
  const XLSX = await import('xlsx');
  const data = raporlar.map((r) => ({
    'Ada': r.ada,
    'Blok': r.blok_no,
    'İş Kalemi': r.is_kalemi,
    'Durum': DURUM_LABELLARI[r.durum] || r.durum,
    'İlerleme (%)': r.ilerleme_yuzde,
    'Tarih': r.tarih,
    'Raporlayan': r.raporlayan,
    'Açıklama': r.aciklama,
    'Oluşturma': r.olusturma_tarihi,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Raporlar');

  ws['!cols'] = [
    { wch: 8 }, { wch: 6 }, { wch: 18 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 40 }, { wch: 22 },
  ];

  XLSX.writeFile(wb, dosyaAdi);
}
