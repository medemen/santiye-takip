import type {
  AdaBlok,
  BlokYapisi,
  DurumTespitSatir,
  ImalatGrubu,
  Sablon,
  SantiyeConfig,
  TahminKural,
} from './types';

export function getAdaList(cfg: SantiyeConfig): AdaBlok[] {
  return cfg.yapi.adalar;
}

export function getAda(cfg: SantiyeConfig, ada: string): AdaBlok | undefined {
  return cfg.yapi.adalar.find((a) => a.ada === ada);
}

export function getBloklar(cfg: SantiyeConfig, ada: string): BlokYapisi[] {
  return getAda(cfg, ada)?.bloklar ?? [];
}

export function getBlok(
  cfg: SantiyeConfig,
  ada: string,
  blokNo: number
): BlokYapisi | undefined {
  return getBloklar(cfg, ada).find((b) => b.blok_no === blokNo);
}

export function getGrupById(cfg: SantiyeConfig, grupId: string): ImalatGrubu | undefined {
  return cfg.isKalemleri.gruplar.find((g) => g.id === grupId);
}

export function getGrupByKalem(cfg: SantiyeConfig, kalem: string): ImalatGrubu | undefined {
  return cfg.isKalemleri.gruplar.find((g) => g.kalemler.includes(kalem));
}

export function getGrupAdiByKalem(cfg: SantiyeConfig, kalem: string): string {
  return getGrupByKalem(cfg, kalem)?.ad ?? '';
}

export function getAllKalemler(cfg: SantiyeConfig): string[] {
  return cfg.isKalemleri.gruplar.flatMap((g) => g.kalemler);
}

export function getSablonById(cfg: SantiyeConfig, id: string): Sablon | undefined {
  return cfg.isKalemleri.sablonlar.find((s) => s.id === id);
}

export function getSablonKalemleri(cfg: SantiyeConfig, sablon: Sablon): string[] {
  return sablon.grup_idleri.flatMap((id) => getGrupById(cfg, id)?.kalemler ?? []);
}

export function getDurumTespitSatiri(
  cfg: SantiyeConfig,
  grup: string,
  kalem: string
): DurumTespitSatir | undefined {
  return cfg.durumTespit?.satirlar.find(([g, k]) => g === grup && k === kalem);
}

export function getReferansToplam(
  cfg: SantiyeConfig,
  ada: string
): { kat: number; blok: number } | undefined {
  return cfg.durumTespit?.referans_toplamlari?.[ada];
}

export function getTahminKurali(cfg: SantiyeConfig, kalem: string): TahminKural | undefined {
  return cfg.durumTespit?.tahmin?.find((t) => t.kalem === kalem);
}
