import { hedefKalanGun } from '../../data/plan';
import type { HedefTakvimGorunumu } from './types';

interface Props {
  santiyeAdi: string;
  ayAdi: string;
  yil: number;
  seciliAda: string;
  ayHedefleri: HedefTakvimGorunumu[];
}

export default function HedefTakvimPdf({ santiyeAdi, ayAdi, yil, seciliAda, ayHedefleri }: Props) {
  return (
    <>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        {santiyeAdi} - Hedef Takvimi
      </div>
      <div style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>
        {ayAdi} {yil}
        {seciliAda ? ` • ${seciliAda}` : ' • Tüm Adalar'}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6' }}>
            <th style={{ border: '1px solid #d1d5db', padding: 6, textAlign: 'left' }}>Ada</th>
            <th style={{ border: '1px solid #d1d5db', padding: 6, textAlign: 'left' }}>Blok</th>
            <th style={{ border: '1px solid #d1d5db', padding: 6, textAlign: 'left' }}>İş Kalemi</th>
            <th style={{ border: '1px solid #d1d5db', padding: 6, textAlign: 'left' }}>Hedef Tarih</th>
            <th style={{ border: '1px solid #d1d5db', padding: 6, textAlign: 'left' }}>Kalan Gün</th>
            <th style={{ border: '1px solid #d1d5db', padding: 6, textAlign: 'left' }}>Durum</th>
            <th style={{ border: '1px solid #d1d5db', padding: 6, textAlign: 'left' }}>İlerleme (%)</th>
          </tr>
        </thead>
        <tbody>
          {ayHedefleri
            .slice()
            .sort((a, b) => a.hedef_tarih.localeCompare(b.hedef_tarih))
            .map((h) => (
              <tr key={`${h.ada}-${h.blok_no}-${h.is_kalemi}`}>
                <td style={{ border: '1px solid #d1d5db', padding: 6 }}>{h.ada}</td>
                <td style={{ border: '1px solid #d1d5db', padding: 6 }}>{h.blok_no === 0 ? 'Ada Geneli' : h.blok_no}</td>
                <td style={{ border: '1px solid #d1d5db', padding: 6 }}>{h.is_kalemi}</td>
                <td style={{ border: '1px solid #d1d5db', padding: 6 }}>{h.hedef_tarih}</td>
                <td style={{ border: '1px solid #d1d5db', padding: 6 }}>{hedefKalanGun(h.hedef_tarih)}</td>
                <td style={{ border: '1px solid #d1d5db', padding: 6, color: h.durum.renk }}>{h.durum.label}</td>
                <td style={{ border: '1px solid #d1d5db', padding: 6 }}>{h.rapor?.ilerleme_yuzde ?? '-'}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </>
  );
}
