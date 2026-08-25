import type { Rapor } from '../types';

const TR_KARAKTERLER: Record<string, string> = {
  'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
  'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U',
};

// Türkçe karakterleri korumadan çevirir; aksi halde ada/kalem adları
// dosya adında alt çizgi yığınına dönüşür.
export function dosyaAdiGuvenli(metin: string): string {
  return metin
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (harf) => TR_KARAKTERLER[harf] ?? harf)
    .replace(/[^a-zA-Z0-9_]/g, '_');
}

export async function elementPdfExport(element: HTMLElement, dosyaAdi: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 10;

  pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
  heightLeft -= pdf.internal.pageSize.getHeight() - 20;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + 10;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pdf.internal.pageSize.getHeight() - 20;
  }

  pdf.save(dosyaAdi);
}

export async function raporPdfExport(rapor: Rapor, element: HTMLElement): Promise<void> {
  const safeName = dosyaAdiGuvenli(`${rapor.ada}_Blok${rapor.blok_no}_${rapor.is_kalemi}`);
  await elementPdfExport(element, `${safeName}.pdf`);
}
