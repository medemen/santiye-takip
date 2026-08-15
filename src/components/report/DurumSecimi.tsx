import type { IsDurumu } from '../../types';
import { DURUM_LABELLARI } from '../../config/defaultConfig';
import SectionTitle from './SectionTitle';

interface Props {
  durum: IsDurumu;
  onChange: (d: IsDurumu) => void;
}

export default function DurumSecimi({ durum, onChange }: Props) {
  return (
    <div>
      <SectionTitle>Durum</SectionTitle>
      <div style={{ display: 'flex', gap: 8 }}>
        {(Object.entries(DURUM_LABELLARI) as [IsDurumu, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            style={{
              flex: 1,
              padding: '10px 8px',
              backgroundColor: durum === key ? '#f59e0b' : '#f3f4f6',
              border: 'none',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              color: durum === key ? '#fff' : '#4b5563',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
