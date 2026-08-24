import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { todayISO, yerelTarih } from './helpers';

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
