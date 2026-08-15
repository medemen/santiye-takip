import ProgressBar from '../ProgressBar';
import { card } from '../../utils/styles';

export interface KalemIlerleme {
  kalem: string;
  ortalama: number;
  raporluBlok: number;
}

interface Props {
  kalemler: KalemIlerleme[];
  toplamKalem: number;
}

export default function KalemIlerlemeKart({ kalemler, toplamKalem }: Props) {
  return (
    <div style={{ ...card }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 4 }}>
        İş Kalemi Bazında İlerleme
      </h3>
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>
        {toplamKalem} iş kalemi • proje geneli ortalama, en düşükten yükseğe
      </div>
      <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
        {kalemler.map((k) => (
          <div key={k.kalem} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              title={`${k.kalem} — %${k.ortalama} (${k.raporluBlok} blokta rapor)`}
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 12,
                color: '#374151',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {k.kalem}
            </span>
            <div style={{ width: 120, flexShrink: 0 }}>
              <ProgressBar value={k.ortalama} height={6} />
            </div>
            <span style={{ width: 42, flexShrink: 0, textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#4b5563' }}>
              %{k.ortalama}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
