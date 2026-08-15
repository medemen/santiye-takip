import type { IsDurumu } from '../types';

export interface SantiyeConfig {
  version: number;
  genel: GenelBilgi;
  marka: MarkaBilgi;
  roller: RolBilgi;
  yapi: YapiBilgi;
  isKalemleri: IsKalemleriBilgi;
  durumTespit: DurumTespitBilgi;
  hakedis?: HakedisBilgi;
}

export interface HakedisBilgi {
  hakedisNo: number;
  kaynak: string;
  gruplar: Record<string, HakedisGrupMeta>;
  adalar: Record<string, { genel: number; gruplar: Record<string, number> }>;
  toplam: number;
  ilerlemeIcmal: {
    adalar: Record<string, Record<string, DisiplinIlerleme>>;
    toplam: { hk9: number; kum: number } | null;
  };
  grupIlerleme?: Record<string, Record<string, HakedisGrupIlerleme>>;
  kalemEslesme: Record<string, string>;
}

export interface HakedisGrupIlerleme {
  pursantaj: number;
  gerceklesen: number;
  imalat_yuzde: number;
}

export interface HakedisGrupMeta {
  ad: string;
  disiplin: 'İNŞ' | 'MEK' | 'ELK';
  sira: number;
}

export interface DisiplinIlerleme {
  imalat: number | null;
  adaBazli: number | null;
  hk9: number | null;
  kum: number | null;
  kumToplam: number | null;
}

export interface GenelBilgi {
  santiyeAdi: string;
  projeAdi: string;
  musteri: string;
  baslangicTarihi?: string;
}

export interface MarkaBilgi {
  appName: string;
  webBasename: string;
  emailDomain: string;
  localStoragePrefix: string;
  capacitorAppId: string;
}

export interface RolBilgi {
  sahaPersoneliRolleri: string[];
  secilebilirRoller: string[];
}

export interface YapiBilgi {
  adalar: AdaBlok[];
}

export interface BlokYapisi {
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
  bloklar: BlokYapisi[];
}

export interface IsKalemleriBilgi {
  gruplar: ImalatGrubu[];
}

export interface ImalatGrubu {
  id: string;
  ad: string;
  kaynak: 'pdf' | 'yeni';
  kalemler: string[];
}

export interface DurumTespitBilgi {
  aciklama: string;
  adalar: string[];
  referans_toplamlari: Record<string, { kat: number; blok: number }>;
  satirlar: DurumTespitSatir[];
  tahmin: TahminKural[];
}

export type DurumTespitSatir = [
  grup: string,
  kalem: string,
  birim: 'KAT' | 'BLOK',
  degerler: Array<[yuzde: number, miktar: number | null]>,
];

export interface TahminKural {
  kalem: string;
  sabit?: number;
  bagimliliklar?: Array<[kalem: string, oran: number]>;
  min_kendi?: string[];
  ust_sinir?: number;
}

export interface BlokDurum {
  blok_no: number;
  is_kalemleri: Record<string, RaporKaydi | null>;
  genel_ilerleme: number;
}

export interface RaporKaydi {
  id: string;
  tarih: string;
  raporlayan: string;
  ada: string;
  blok_no: number;
  is_kalemi: string;
  durum: IsDurumu;
  ilerleme_yuzde: number;
  aciklama: string;
  olusturma_tarihi: string;
}
