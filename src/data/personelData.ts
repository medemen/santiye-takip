import personelJson from '../../data/personel.json';
import type { PersonelData, Personel } from '../types';

export const personelData = personelJson as PersonelData;

export function getSantiyeSefi(ada: string): string {
  const sef = personelData.santiye_sefleri.find((s) => s.adalar.includes(ada));
  return sef?.ad_soyad ?? 'Belirtilmemiş';
}

export function getBlokSorumlulari(ada: string): string[] {
  const sef = personelData.santiye_sefleri.find((s) => s.adalar.includes(ada));
  if (!sef) return [];
  return personelData.personel
    .filter((p) => p.atanan_ada && sef.adalar.includes(p.atanan_ada))
    .map((p) => p.ad_soyad);
}

export function getAdaPersonelleri(ada: string): Personel[] {
  return personelData.personel.filter((p) => p.atanan_ada === ada);
}

export function getAtanmamisPersonel(): Personel[] {
  return personelData.personel.filter((p) => !p.atanan_ada);
}

export function getPersonelBySef(sefAdi: string): Personel[] {
  const sef = personelData.santiye_sefleri.find((s) => s.ad_soyad === sefAdi);
  if (!sef) return [];
  return personelData.personel.filter((p) => p.atanan_ada && sef.adalar.includes(p.atanan_ada));
}

export function getAllPersonel() {
  return personelData.personel.map((p) => ({
    ad_soyad: p.ad_soyad,
    rol: p.rol,
    atanan_ada: p.atanan_ada,
  }));
}

export function isSantiyeSefi(ad_soyad: string): boolean {
  return personelData.santiye_sefleri.some((s) => s.ad_soyad === ad_soyad);
}

export function isProjeMuduru(ad_soyad: string): boolean {
  return personelData.personel.some((p) => p.ad_soyad === ad_soyad && p.proje_muduru);
}

export function getSefAdalar(ad_soyad: string): string[] {
  const sef = personelData.santiye_sefleri.find((s) => s.ad_soyad === ad_soyad);
  return sef?.adalar ?? [];
}
