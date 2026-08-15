import type { Rapor } from '../../types';

export interface HedefTakvimGorunumu {
  ada: string;
  blok_no: number;
  is_kalemi: string;
  hedef_tarih: string;
  rapor: Rapor | null;
  durum: { label: string; renk: string };
}
