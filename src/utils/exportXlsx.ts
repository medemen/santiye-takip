import type { Rapor } from '../types';
import { DURUM_LABELLARI } from '../config/defaultConfig';
import { hedefKalanGun } from '../data/plan';
import { raporEtkinYuzde } from '../stores/reportStore';

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
    // Sayisal yaz: "75%" metni Excel'de filtre/formul engeller
    'İlerleme (%)': rapor ? raporEtkinYuzde(rapor) : '',
    'Son Rapor Durumu': rapor ? DURUM_LABELLARI[rapor.durum] || rapor.durum : 'Rapor Yok',
  };
}

export async function hedeflerXlsxExport(
  hedefler: HedefExportKaynak[],
  raporBul: (ada: string, blokNo: number, isKalemi: string) => Rapor | null,
  dosyaAdi = 'hedef-takvimi.xlsx',
  meta?: XlsxMeta
): Promise<void> {
  if (hedefler.length === 0) throw new Error('Dışa aktarılacak veri bulunamadı');
  const XLSX = await import('xlsx');
  const satirlar = hedefler
    .slice()
    .sort((a, b) => a.hedef_tarih.localeCompare(b.hedef_tarih))
    .map((h) => hedefSatiri(h, raporBul));

  const ws = metaSheet(XLSX, meta, satirlar.length, 'Hedef Sayısı', satirlar);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hedef Takvimi');

  XLSX.writeFile(wb, dosyaAdi);
}

export interface RaporOzetSatiri {
  Ada: string;
  'Rapor Sayısı': number;
  Tamamlandı: number;
  'Devam Ediyor': number;
  Planlandı: number;
  Gecikme: number;
  'Ortalama İlerleme (%)': number;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const g = String(d.getDate()).padStart(2, '0');
  const a = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  const s = String(d.getHours()).padStart(2, '0');
  const dk = String(d.getMinutes()).padStart(2, '0');
  return `${g}.${a}.${y} ${s}:${dk}`;
}

export interface XlsxMeta {
  santiyeAdi?: string;
}

// Meta satirlari + bosluk + basliklar + veri satirlarini tek AOA'da birlestirir.
function metaSheet(
  XLSX: typeof import('xlsx'),
  meta: XlsxMeta | undefined,
  kayitSayisi: number,
  kayitAdi: string,
  satirlar: Record<string, string | number>[]
) {
  const basliklar = Object.keys(satirlar[0] ?? {});
  const aoa: (string | number)[][] = [
    ['Şantiye', meta?.santiyeAdi ?? '-'],
    [kayitAdi, kayitSayisi],
    ['Dışa Aktarma Zamanı', formatDateTime(new Date().toISOString())],
    [],
    basliklar,
    ...satirlar.map((s) => basliklar.map((b) => s[b] ?? '')),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = basliklar.map((b, i) => ({
    wch: Math.min(
      42,
      Math.max(b.length + 2, ...aoa.slice(5).map((r) => String(r[i]).length + 2), 8)
    ),
  }));
  return ws;
}

function adaOzetleri(raporlar: Rapor[]): RaporOzetSatiri[] {
  const harita = new Map<string, RaporOzetSatiri>();
  for (const r of raporlar) {
    const mevcut = harita.get(r.ada) ?? {
      Ada: r.ada,
      'Rapor Sayısı': 0,
      Tamamlandı: 0,
      'Devam Ediyor': 0,
      Planlandı: 0,
      Gecikme: 0,
      'Ortalama İlerleme (%)': 0,
    };
    mevcut['Rapor Sayısı']++;
    if (r.durum === 'tamamlandi') mevcut.Tamamlandı++;
    else if (r.durum === 'devam_ediyor') mevcut['Devam Ediyor']++;
    else if (r.durum === 'planlandi') mevcut.Planlandı++;
    else if (r.durum === 'gecikme') mevcut.Gecikme++;
    mevcut['Ortalama İlerleme (%)'] += raporEtkinYuzde(r);
    harita.set(r.ada, mevcut);
  }
  for (const satir of harita.values()) {
    satir['Ortalama İlerleme (%)'] = Math.round(
      satir['Ortalama İlerleme (%)'] / satir['Rapor Sayısı']
    );
  }
  return Array.from(harita.values()).sort((a, b) => a.Ada.localeCompare(b.Ada, 'tr'));
}

export async function raporlarXlsxExport(
  raporlar: Rapor[],
  dosyaAdi = 'raporlar.xlsx',
  hedefBul?: (ada: string, blokNo: number, isKalemi: string) => { hedef_tarih: string } | undefined,
  meta?: XlsxMeta
): Promise<void> {
  if (raporlar.length === 0) throw new Error('Dışa aktarılacak veri bulunamadı');
  const XLSX = await import('xlsx');
  const data = raporlar.map((r) => {
    const hedef = hedefBul?.(r.ada, r.blok_no, r.is_kalemi);
    const satir: Record<string, string | number> = {
      'Ada': r.ada,
      'Blok': r.blok_no === 0 ? 'Ada Geneli' : r.blok_no,
      'İş Kalemi': r.is_kalemi,
      'Durum': DURUM_LABELLARI[r.durum] || r.durum,
      'İlerleme (%)': r.ilerleme_yuzde,
      'Tarih': r.tarih,
      'Raporlayan': r.raporlayan,
      'Açıklama': r.aciklama || '-',
      'Oluşturma': formatDateTime(r.olusturma_tarihi),
    };
    if (hedef) {
      const kalanGun = hedefKalanGun(hedef.hedef_tarih);
      satir['Hedef Tarih'] = hedef.hedef_tarih;
      satir['Hedefe Kalan Gün'] = kalanGun;
      if (r.durum !== 'tamamlandi' && kalanGun < 0) satir['Durum'] = 'GECİKMİŞ';
    }
    return satir;
  });

  // Hedef kolonlari yalnizca bazilarda var; AOA tabanli sheet ayni sutun
  // sayisi beklediginden eksik alanlari bos doldur.
  const tumBasliklar = Array.from(new Set(data.flatMap((d) => Object.keys(d))));
  const duzenli = data.map((d) => {
    const tam: Record<string, string | number> = {};
    for (const b of tumBasliklar) tam[b] = d[b] ?? '';
    return tam;
  });

  const ws = metaSheet(XLSX, meta, duzenli.length, 'Rapor Sayısı', duzenli);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Raporlar');

  const ozet = XLSX.utils.json_to_sheet(adaOzetleri(raporlar));
  XLSX.utils.book_append_sheet(wb, ozet, 'Ada Özeti');
  ozet['!cols'] = [
    { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
    { wch: 10 }, { wch: 10 }, { wch: 20 },
  ];

  XLSX.writeFile(wb, dosyaAdi);
}
