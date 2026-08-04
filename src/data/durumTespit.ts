import durumJson from '../../data/durum_tespit.json';

export type DurumTespitBirim = 'KAT' | 'BLOK' | '';

export interface DurumTespitDeger {
  yuzde: number | null;
  miktar: number | null;
}

export interface DurumTespitSatir {
  grup: string;
  kalem: string;
  birim: DurumTespitBirim;
  degerler: DurumTespitDeger[];
}

export interface DurumTespitReferans {
  kat: number;
  blok: number;
}

export interface TahminSabit {
  kalem: string;
  sabit: number;
}

export interface TahminBagimlilik {
  kalem: string;
  bagimliliklar: [string, number][];
  ust_sinir?: number;
}

export interface TahminMinKendi {
  kalem: string;
  min_kendi: string[];
}

export type TahminKural = TahminSabit | TahminBagimlilik | TahminMinKendi;

export interface DurumTespit {
  aciklama: string;
  adalar: string[];
  referans_toplamlari: Record<string, DurumTespitReferans>;
  satirlar: DurumTespitSatir[];
  tahmin: TahminKural[];
}

export const durumTespit: DurumTespit = durumJson as unknown as DurumTespit;

export const DURUM_TESPIT_ADALAR: readonly string[] = durumTespit.adalar;
export const DURUM_TESPIT_REFERANSLAR: Readonly<
  Record<string, DurumTespitReferans>
> = durumTespit.referans_toplamlari;
export const DURUM_TESPIT_SATIRLAR: readonly DurumTespitSatir[] =
  durumTespit.satirlar;
export const DURUM_TESPIT_TAHMIN: readonly TahminKural[] = durumTespit.tahmin;

export function durumTespitSatirBul(
  kalem: string
): DurumTespitSatir | undefined {
  return durumTespit.satirlar.find((s) => s.kalem === kalem);
}
