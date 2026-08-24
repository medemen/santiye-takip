import { describe, expect, it } from 'vitest';
import { auditDegisiklikOzeti } from './audit';
import type { AuditKaydi } from './audit';

function kayit(uzerine: Partial<AuditKaydi>): AuditKaydi {
  return {
    id: 1,
    tablo_adi: 'raporlar',
    kayit_id: '42',
    islem: 'UPDATE',
    eski_deger: {},
    yeni_deger: {},
    islem_yapan_ad: 'Ali Veli',
    islem_zamani: '2026-08-24T10:00:00Z',
    ...uzerine,
  };
}

describe('auditDegisiklikOzeti', () => {
  it('INSERT ve DELETE icin bos ozet dondurur', () => {
    expect(auditDegisiklikOzeti(kayit({ islem: 'INSERT' }))).toEqual([]);
    expect(auditDegisiklikOzeti(kayit({ islem: 'DELETE' }))).toEqual([]);
  });

  it('degisen alanlari eski → yeni olarak listeler', () => {
    const ozet = auditDegisiklikOzeti(
      kayit({
        eski_deger: { ilerleme_yuzde: 40, durum: 'devam_ediyor' },
        yeni_deger: { ilerleme_yuzde: 75, durum: 'devam_ediyor' },
      })
    );
    expect(ozet).toEqual(['ilerleme_yuzde: 40 → 75']);
  });

  it('gurultu alanlarini (updated_at, version) atlar', () => {
    const ozet = auditDegisiklikOzeti(
      kayit({
        eski_deger: { updated_at: 'a', version: 1, not: 'eski' },
        yeni_deger: { updated_at: 'b', version: 2, not: 'yeni' },
      })
    );
    expect(ozet).toEqual(['not: eski → yeni']);
  });

  it('null → deger gecisini tire ile gosterir', () => {
    const ozet = auditDegisiklikOzeti(
      kayit({
        eski_deger: { aciklama: null },
        yeni_deger: { aciklama: 'siva bitti' },
      })
    );
    expect(ozet).toEqual(['aciklama: — → siva bitti']);
  });

  it('40 karakteri asan degerleri kisaltir', () => {
    const uzun = 'x'.repeat(50);
    const ozet = auditDegisiklikOzeti(
      kayit({ yeni_deger: { aciklama: uzun } })
    );
    expect(ozet[0]).toBe(`aciklama: — → ${'x'.repeat(37)}…`);
    expect(ozet[0].length).toBeLessThan(60);
  });
});
