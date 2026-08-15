import { card } from '../../utils/styles';

export interface AdaDetaySatiri {
  ada: string;
  toplam: number;
  tamam: number;
  devam: number;
  gecikme: number;
  plan: number;
  ilerleme: number;
}

interface Props {
  adalar: AdaDetaySatiri[];
  onAdaTikla: (ada: string) => void;
}

export default function AdaDetayKart({ adalar, onAdaTikla }: Props) {
  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', margin: 0, marginBottom: 12 }}>
        Ada Detay
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {adalar.map((a) => (
          <div
            key={a.ada}
            onClick={() => onAdaTikla(a.ada)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              backgroundColor: 'var(--bg-page)',
              borderRadius: 10,
              cursor: 'pointer',
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{a.ada}</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                {a.toplam} rapor • %{a.ilerleme}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
              <span style={{ color: '#22c55e' }}>✅{a.tamam}</span>
              <span style={{ color: '#3b82f6' }}>🔵{a.devam}</span>
              <span style={{ color: '#ef4444' }}>⚠️{a.gecikme}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
