import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { todayISO, yerelTarih, gelecektekiTarihMi, formatDateTime, formatDateTimeSabit } from './helpers';

describe('todayISO', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('yerel gece yarisi sonrasinda ayni gunu verir (UTC kaymasi olmamali)', () => {
    // UTC+3'te 00:30 yerel = 21:30 onceki gun UTC; toISOString hata verirdi
    vi.setSystemTime(new Date('2026-03-15T00:30:00+03:00'));
    expect(todayISO()).toBe('2026-03-15');
  });

  it('gun sonunda hala ayni gunu verir', () => {
    vi.setSystemTime(new Date('2026-03-15T23:59:59+03:00'));
    expect(todayISO()).toBe('2026-03-15');
  });

  it('yil basi donumunu dogru yazar', () => {
    vi.setSystemTime(new Date('2027-01-01T01:05:00+03:00'));
    expect(todayISO()).toBe('2027-01-01');
  });
});

describe('yerelTarih', () => {
  it("'YYYY-MM-DD' metnini yerel gece yarisi olarak kurar", () => {
    const d = yerelTarih('2026-08-24');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(24);
    expect(d.getHours()).toBe(0);
  });

  it('UTC parse kaymasina dusmez (negatif offset simülasyonu)', () => {
    // new Date('2026-08-24') UTC gece yarisi; America/New_York'ta 20:00
    // onceki gun olurdu. yerelTarih bunu yasamaz.
    const d = yerelTarih('2026-08-24');
    expect(d.toISOString().slice(0, 10)).toBe(
      new Date(2026, 7, 24).toISOString().slice(0, 10)
    );
  });

  it('todayISO ciktisi ile yuvarlak tur calisir', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-24T12:00:00+03:00'));
      const d = yerelTarih(todayISO());
      expect(d.getDate()).toBe(24);
      expect(d.getMonth()).toBe(7);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ay ve gun tek haneliyken de dogru kurar', () => {
    const d = yerelTarih('2026-1-5');
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(5);
  });
});

describe('gelecektekiTarihMi', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('bugun ve gecmis tarihler kabul edilir', () => {
    vi.setSystemTime(new Date('2026-08-24T12:00:00+03:00'));
    expect(gelecektekiTarihMi('2026-08-24')).toBe(false);
    expect(gelecektekiTarihMi('2026-08-23')).toBe(false);
    expect(gelecektekiTarihMi('2025-01-01')).toBe(false);
  });

  it('yarindan sonrasi reddedilir', () => {
    vi.setSystemTime(new Date('2026-08-24T23:59:00+03:00'));
    expect(gelecektekiTarihMi('2026-08-25')).toBe(true);
    expect(gelecektekiTarihMi('2027-01-01')).toBe(true);
  });

  it('bos/eksik tarih kabul edilir (baska yerde zorunlu alan)', () => {
    expect(gelecektekiTarihMi('')).toBe(false);
  });

  it('gun donumunde sinir dogru calisir (yerel gece yarisi)', () => {
    // 2026-08-24 yerel 23:59 -> yarın reddedilir; ertesi gun 00:30'da
    // '2026-08-25' artik bugun oldugu icin kabul edilmeli
    vi.setSystemTime(new Date('2026-08-24T23:59:00+03:00'));
    expect(gelecektekiTarihMi('2026-08-25')).toBe(true);
    vi.setSystemTime(new Date('2026-08-25T00:30:00+03:00'));
    expect(gelecektekiTarihMi('2026-08-25')).toBe(false);
  });
});

describe('formatDateTime', () => {
  it('gecerli ISO tarihini yerel formatta donusturur', () => {
    const sonuc = formatDateTime('2026-08-24T14:30:00Z');
    expect(sonuc).toContain('24');
    expect(sonuc).toContain('08');
    expect(sonuc).toContain('2026');
  });

  it('gecersiz tarihi oldugu gibi dondurur', () => {
    expect(formatDateTime('bozuk-tarih')).toBe('bozuk-tarih');
  });
});

describe('formatDateTimeSabit', () => {
  it('DD.MM.YYYY HH:MM formatinda dondurur', () => {
    const sonuc = formatDateTimeSabit('2026-08-24T14:30:00Z');
    // Sabit format tarayicidan bagimsiz olmali
    expect(sonuc).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
  });

  it('gecersiz tarihi oldugu gibi dondurur', () => {
    expect(formatDateTimeSabit('bozuk')).toBe('bozuk');
  });

  it('tek haneli ay/gun ve saat/dakikayi padStart ile doldurur', () => {
    // 2026-01-05T09:05:00Z -> 05.01.2026 09:05 (UTC+offset farki olabilir)
    const sonuc = formatDateTimeSabit('2026-01-05T09:05:00Z');
    expect(sonuc).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
  });
});
