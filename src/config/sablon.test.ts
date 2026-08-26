import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './defaultConfig';

describe('raporSablonu config', () => {
  it('varsayilan config raporSablonu icerir', () => {
    const sablon = DEFAULT_CONFIG.raporSablonu;
    expect(sablon).toBeDefined();
    expect(sablon!.aciklamaZorunluKalemler).toEqual([]);
    expect(sablon!.varsayilanAciklama).toBe('');
    expect(sablon!.baslikOnEkleri).toEqual({});
  });
});
