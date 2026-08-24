export interface AuditKaydi {
  id: number;
  tablo_adi: string;
  kayit_id: string;
  islem: 'INSERT' | 'UPDATE' | 'DELETE';
  eski_deger: Record<string, unknown> | null;
  yeni_deger: Record<string, unknown> | null;
  islem_yapan_ad: string | null;
  islem_zamani: string;
}

export const TABLO_ETIKETLERI: Record<string, string> = {
  raporlar: 'Rapor',
  is_kalemi_hedefleri: 'Hedef',
  kullanicilar: 'Kullanıcı',
};

export const ISLEM_ETIKETLERI: Record<AuditKaydi['islem'], string> = {
  INSERT: 'Ekleme',
  UPDATE: 'Güncelleme',
  DELETE: 'Silme',
};

const ATLANAN_ALANLAR = new Set(['id', 'updated_at', 'olusturma_tarihi', 'version']);

function degerMetni(deger: unknown): string {
  const metin =
    deger === null || deger === undefined
      ? '—'
      : typeof deger === 'object'
        ? JSON.stringify(deger)
        : String(deger);
  return metin.length > 40 ? `${metin.slice(0, 37)}…` : metin;
}

// UPDATE kayitlarinda degisen alanlari "alan: eski → yeni" olarak listeler;
// INSERT/DELETE'te bos doner (islem etiketi yeterli bilgiyi verir).
export function auditDegisiklikOzeti(kayit: AuditKaydi): string[] {
  if (kayit.islem !== 'UPDATE') return [];
  const eski = kayit.eski_deger ?? {};
  const yeni = kayit.yeni_deger ?? {};
  const ozet: string[] = [];
  for (const alan of Object.keys(yeni)) {
    if (ATLANAN_ALANLAR.has(alan)) continue;
    const onceki = alan in eski ? eski[alan] : undefined;
    if (JSON.stringify(onceki) !== JSON.stringify(yeni[alan])) {
      ozet.push(`${alan}: ${degerMetni(onceki)} → ${degerMetni(yeni[alan])}`);
    }
  }
  return ozet;
}
