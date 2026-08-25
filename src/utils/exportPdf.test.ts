import { describe, expect, it } from 'vitest';
import { dosyaAdiGuvenli } from './exportPdf';

describe('dosyaAdiGuvenli', () => {
  it('Türkçe karakterleri korur: Ş→S, ğ→g, ı→i, İ→I, ö→o, ü→u, ç→c', () => {
    expect(dosyaAdiGuvenli('Ağustos_Şubat')).toBe('Agustos_Subat');
    expect(dosyaAdiGuvenli('Işıl_İç_Cephe')).toBe('Isil_Ic_Cephe');
  });

  it('büyük harf İ ve I ayrımı korunur', () => {
    expect(dosyaAdiGuvenli('İş')).toBe('Is');
  });

  it('boşluk, eğik çizgi ve nokta alt çizgiye döner', () => {
    expect(dosyaAdiGuvenli('A/B Blok 3. Kat')).toBe('A_B_Blok_3__Kat');
  });

  it('ASCII metin değişmeden kalır', () => {
    expect(dosyaAdiGuvenli('Ada_A_Blok1_Siva')).toBe('Ada_A_Blok1_Siva');
  });
});
