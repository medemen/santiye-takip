export interface Personel {
  ad_soyad: string;
  rol: string;
  atanan_ada: string | null;
  proje_muduru?: boolean;
}

export interface SantiyeSefi {
  ad_soyad: string;
  adalar: string[];
}

export interface PersonelData {
  aciklama: string;
  proje: string;
  tarih: string;
  santiye_sefleri: SantiyeSefi[];
  personel: Personel[];
}

export interface Blok {
  blok_no: number;
  tip: string;
  daire_sayisi: number;
  yapi_konfigurasyonu: string;
  kat_sayisi: number;
}

export interface AdaBlok {
  ada: string;
  blok_sayisi: number;
  toplam_daire: number;
  toplam_kat: number;
  bloklar: Blok[];
}

export interface BlokData {
  aciklama: string;
  proje: string;
  adalar: AdaBlok[];
  pdf_referans_toplamlari: Record<string, { blok: number; daire: number; kat: number }>;
  not: string;
}

export interface Oturum {
  user_id: string | null;
  ad_soyad: string;
  rol: string;
  admin: boolean;
  proje_muduru: boolean;
  yetkili_adalar: string[];
  giris_tarihi: string;
}

export interface BlokAtamasi {
  [ada: string]: number[];
}

export interface KullaniciAtamalari {
  [ad_soyad: string]: BlokAtamasi;
}

export type IsDurumu =
  | 'planlandi'
  | 'devam_ediyor'
  | 'tamamlandi'
  | 'gecikme';

export interface Rapor {
  id: string;
  tarih: string;
  raporlayan: string;
  ada: string;
  // blok_no 0 = ada geneli rapor (DURUM TESPİT aktarımı)
  blok_no: number;
  is_kalemi: string;
  durum: IsDurumu;
  ilerleme_yuzde: number;
  aciklama: string;
  olusturma_tarihi: string;
}

export interface BlokProgress {
  blok_no: number;
  is_kalemleri: Record<string, Rapor | null>;
  genel_ilerleme: number;
}
