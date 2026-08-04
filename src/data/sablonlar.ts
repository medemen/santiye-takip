import { getGrupById } from './isKalemleri';

export interface Sablon {
  id: string;
  ad: string;
  aciklama: string;
  grup_idleri: string[];
  varsayilan_durum: string;
}

export const SABLONLAR: Sablon[] = [
  {
    id: 'kaba-isler',
    ad: 'Kaba İşler',
    aciklama: 'Hafriyat, betonarme ve subasman işleri',
    grup_idleri: ['kaba-isler'],
    varsayilan_durum: 'tamamlandi',
  },
  {
    id: 'duvar-yalitim',
    ad: 'Duvar & Yalıtım',
    aciklama: 'Perde/yapı duvarı, izolasyon ve drenaj işleri',
    grup_idleri: ['duvar-yalitim'],
    varsayilan_durum: 'devam_ediyor',
  },
  {
    id: 'ince-isler',
    ad: 'İnce İşler',
    aciklama: 'Sıva, döşeme, seramik, doğrama, mobilya ve mermer işleri',
    grup_idleri: ['ic-siva', 'doseme', 'seramik', 'dogramalar', 'mobilya-kapi', 'mermer'],
    varsayilan_durum: 'devam_ediyor',
  },
  {
    id: 'mekanik-elektrik',
    ad: 'Mekanik & Elektrik',
    aciklama: 'Tesisat, asansör ve zayıf akım işleri',
    grup_idleri: ['mekanik-tesisat', 'elektrik-tesisat', 'asansor', 'zayif-akim'],
    varsayilan_durum: 'devam_ediyor',
  },
  {
    id: 'cephe-cati',
    ad: 'Cephe & Çatı',
    aciklama: 'Cephe, korkuluk ve bina girişi işleri',
    grup_idleri: ['dis-cephe', 'korkuluk', 'bina-giris'],
    varsayilan_durum: 'devam_ediyor',
  },
];

export function getSablonKalemleri(sablon: Sablon): string[] {
  return sablon.grup_idleri.flatMap(
    (id) => getGrupById(id)?.kalemler ?? []
  );
}

export function getSablonById(id: string): Sablon | undefined {
  return SABLONLAR.find((s) => s.id === id);
}
