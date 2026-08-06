import type {
  AdaBlok,
  BlokYapisi,
  ImalatGrubu,
  Sablon,
  SantiyeConfig,
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

const _kalemCache = new WeakMap<SantiyeConfig, string[]>();

export function getAllKalemler(cfg: SantiyeConfig): string[] {
  let liste = _kalemCache.get(cfg);
  if (!liste) {
    liste = cfg.isKalemleri.gruplar.flatMap((g) => g.kalemler);
    _kalemCache.set(cfg, liste);
  }
  return liste;
}

export function getSablonKalemleri(cfg: SantiyeConfig, sablon: Sablon): string[] {
  return sablon.grup_idleri.flatMap((id) => getGrupById(cfg, id)?.kalemler ?? []);
}
