import ProgressBar from '../ProgressBar';
import { card } from '../../utils/styles';

export interface AdaDetaySatir {
  ada: string;
  toplam: number;
  tamam: number;
  devam: number;
  gecikme: number;
  plan: number;
  ilerleme: number;
}

interface Props {
  satirlar: AdaDetaySatir[];
  onNavigate: (ada: string) => void;
}

export default function AdaDetayTablo({ satirlar, onNavigate }: Props) {
  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', margin: 0, marginBottom: 10 }}>
        Ada Detay
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr 1fr 1fr 1.6fr', gap: 8, padding: '8px 12px', fontSize: 11, color: 'var(--text-subtle)', fontWeight: 600 }}>
          <span>Ada</span>
          <span>Rapor</span>
          <span>Tamam</span>
          <span>Devam</span>
          <span>Gecikme</span>
          <span>İlerleme</span>
        </div>
        {satirlar.map((a) => (
          <div
            key={a.ada}
            onClick={() => onNavigate(a.ada)}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 0.8fr 1fr 1fr 1fr 1.6fr',
              gap: 8,
              alignItems: 'center',
              padding: '8px 12px',
              borderTop: '1px solid #f0f0f0',
              fontSize: 13,
              cursor: 'pointer',
              backgroundColor: 'var(--bg-card)',
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.ada}</span>
            <span style={{ color: 'var(--text-faint)' }}>{a.toplam}</span>
            <span style={{ color: '#22c55e' }}>✅ {a.tamam}</span>
            <span style={{ color: '#3b82f6' }}>🔵 {a.devam}</span>
            <span style={{ color: '#ef4444' }}>⚠️ {a.gecikme}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <ProgressBar value={a.ilerleme} height={8} />
              </div>
              <span style={{ fontWeight: 600, color: 'var(--text-muted)', width: 40, textAlign: 'right' }}>%{a.ilerleme}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
