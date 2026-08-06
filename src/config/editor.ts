import type {
  AdaBlok,
  BlokYapisi,
  DurumTespitBilgi,
  ImalatGrubu,
  Sablon,
  SantiyeConfig,
} from './types';
import { DEFAULT_CONFIG } from './defaultConfig';

export function bosDurumTespit(): DurumTespitBilgi {
  return { aciklama: '', adalar: [], referans_toplamlari: {}, satirlar: [], tahmin: [] };
}

export function bosSantiyeConfig(genel?: Partial<SantiyeConfig['genel']>): SantiyeConfig {
  return {
    version: DEFAULT_CONFIG.version,
    genel: {
      santiyeAdi: '',
      projeAdi: '',
      musteri: '',
      ...genel,
    },
    marka: { ...DEFAULT_CONFIG.marka },
    roller: {
      sahaPersoneliRolleri: ['Saha Mühendisi'],
      secilebilirRoller: [...DEFAULT_CONFIG.roller.secilebilirRoller],
    },
    yapi: { adalar: [] },
    isKalemleri: { gruplar: [], sablonlar: [] },
    durumTespit: bosDurumTespit(),
  };
}

export function bosBlok(no: number, template?: BlokYapisi): BlokYapisi {
  return {
    blok_no: no,
    tip: template?.tip ?? 'TİP-1',
    daire_sayisi: template?.daire_sayisi ?? 0,
    yapi_konfigurasyonu: template?.yapi_konfigurasyonu ?? '',
    kat_sayisi: template?.kat_sayisi ?? 0,
  };
}

export function adaTamamla(ada: AdaBlok): AdaBlok {
  const bloklar = ada.bloklar.map((b, i) => ({ ...b, blok_no: i + 1 }));
  const toplam_daire = bloklar.reduce((s, b) => s + (b.daire_sayisi || 0), 0);
  const toplam_kat = bloklar.reduce((s, b) => s + (b.kat_sayisi || 0), 0);
  return { ...ada, bloklar, blok_sayisi: bloklar.length, toplam_daire, toplam_kat };
}

export function adaBloklariniYenidenUret(ada: AdaBlok): AdaBlok {
  const n = Math.max(0, Math.floor(ada.blok_sayisi) || 0);
  const template = ada.bloklar[0];
  return adaTamamla({
    ...ada,
    bloklar: Array.from({ length: n }, (_, i) => bosBlok(i + 1, template)),
  });
}

export function durumTespitUret(cfg: SantiyeConfig): DurumTespitBilgi {
  const eski = cfg.durumTespit ?? bosDurumTespit();
  const adalar: string[] = [];
  const referans_toplamlari: DurumTespitBilgi['referans_toplamlari'] = {};
  for (const a of cfg.yapi.adalar) {
    adalar.push(a.ada);
    referans_toplamlari[a.ada] = {
      kat: a.bloklar.reduce((s, b) => s + (b.kat_sayisi || 0), 0),
      blok: a.bloklar.length,
    };
  }
  return { ...eski, adalar, referans_toplamlari };
}

export function slugId(ad: string): string {
  return ad
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function benzersizId(ad: string, mevcut: string[]): string {
  let id = slugId(ad) || 'grup';
  let n = 2;
  while (mevcut.includes(id)) id = `${slugId(ad) || 'grup'}-${n++}`;
  return id;
}

export function sablonlariUret(gruplar: ImalatGrubu[]): Sablon[] {
  return gruplar.map((g) => ({
    id: g.id,
    ad: g.ad,
    aciklama: '',
    grup_idleri: [g.id],
    varsayilan_durum: 'devam_ediyor',
    varsayilan_ilerleme: 50,
    varsayilan_aciklama: '',
  }));
}

export function configValidate(cfg: SantiyeConfig): string[] {
  const hata: string[] = [];
  if (!cfg.genel.santiyeAdi.trim()) hata.push('Şantiye adı boş olamaz.');

  if (!cfg.yapi.adalar.length) hata.push('En az bir ada tanımlanmalı.');

  const adaAdlari = cfg.yapi.adalar.map((a) => a.ada.trim());
  cfg.yapi.adalar.forEach((a, i) => {
    if (!a.ada.trim()) {
      hata.push(`Ada #${i + 1} adı boş olamaz.`);
      return;
    }
    if (adaAdlari.filter((x) => x === a.ada.trim()).length > 1) {
      hata.push(`'${a.ada}' ada adı birden fazla kez kullanıldı.`);
    }
    if (!a.bloklar.length) {
      hata.push(`'${a.ada}' için en az bir blok tanımlanmalı.`);
    }
    const no = a.bloklar.map((b) => b.blok_no);
    if (new Set(no).size !== no.length) {
      hata.push(`'${a.ada}' içinde tekrarlanan blok numarası var.`);
    }
  });

  const kalemler = cfg.isKalemleri.gruplar.flatMap((g) =>
    g.kalemler.map((k) => k.trim()).filter(Boolean)
  );
  if (kalemler.length && new Set(kalemler).size !== kalemler.length) {
    hata.push('İş kalemleri içinde tekrarlanan ad var.');
  }

  const grupIdler = cfg.isKalemleri.gruplar.map((g) => g.id);
  cfg.isKalemleri.gruplar.forEach((g) => {
    if (!g.id.trim()) hata.push('Grubu kimliği (id) boş olamaz.');
    if (!g.ad.trim()) hata.push(`'${g.id || '?'}' grubunun adı boş olamaz.`);
    if (!g.kalemler.length) hata.push(`'${g.ad || g.id}' grubunda en az bir kalem olmalı.`);
  });
  if (new Set(grupIdler).size !== grupIdler.length) {
    hata.push('Grup kimlikleri (id) tekrarlanamaz.');
  }

  cfg.isKalemleri.sablonlar.forEach((s) => {
    s.grup_idleri.forEach((gid) => {
      if (!grupIdler.includes(gid)) {
        hata.push(`'${s.ad}' şablonu bilinmeyen grup '${gid}' referans veriyor.`);
      }
    });
    const ilerleme = s.varsayilan_ilerleme;
    if (ilerleme !== undefined && (Number.isNaN(ilerleme) || ilerleme < 0 || ilerleme > 100)) {
      hata.push(`'${s.ad}' şablonunun varsayılan ilerlemesi 0-100 arasında olmalı.`);
    }
    if (!s.grup_idleri.length) {
      hata.push(`'${s.ad}' şablonu hiçbir grubu kapsamıyor.`);
    }
  });

  return hata;
}
