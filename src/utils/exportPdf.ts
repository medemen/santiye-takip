import type { Rapor } from '../types';
import { DURUM_LABELLARI } from '../data/isKalemleri';

export async function raporPdfExport(rapor: Rapor, element: HTMLElement): Promise<void> {
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

  const safeName = `${rapor.ada}_Blok${rapor.blok_no}_${rapor.is_kalemi}`
    .replace(/[^a-zA-Z0-9_]/g, '_');
  pdf.save(`${safeName}.pdf`);
}

export function raporMetinExport(rapor: Rapor): string {
  return [
    `Ada: ${rapor.ada}`,
    `Blok: ${rapor.blok_no}`,
    `İş Kalemi: ${rapor.is_kalemi}`,
    `Durum: ${DURUM_LABELLARI[rapor.durum] || rapor.durum}`,
    `İlerleme: %${rapor.ilerleme_yuzde}`,
    `Tarih: ${rapor.tarih}`,
    `Raporlayan: ${rapor.raporlayan}`,
    `Açıklama: ${rapor.aciklama || '-'}`,
    '',
  ].join('\n');
}
