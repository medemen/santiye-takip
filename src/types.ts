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

export interface Blok {
  blok_no: number;
  tip: string;
  daire_sayisi: number;
  yapi_konfigurasyonu: string;
  kat_sayisi: number;
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

export interface IsKalemiHedefi {
  id: number;
  ada: string;
  blok_no: number;
  is_kalemi: string;
  hedef_tarih: string; // yyyy-mm-dd
}
