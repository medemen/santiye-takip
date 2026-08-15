import type { AdaBlok } from '../../config/types';
import SectionTitle from './SectionTitle';

interface Props {
  adalar: AdaBlok[];
  secili: string;
  onSelect: (ada: string) => void;
}

export default function AdaSecimi({ adalar, secili, onSelect }: Props) {
  return (
    <div>
      <SectionTitle>Ada</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {adalar.map((a) => (
          <button
            key={a.ada}
            data-ada={a.ada}
            onClick={() => onSelect(a.ada)}
            style={{
              padding: '12px 14px',
              backgroundColor: secili === a.ada ? '#f59e0b' : '#f9fafb',
              border: '1px solid',
              borderColor: secili === a.ada ? '#f59e0b' : '#e5e7eb',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: secili === a.ada ? '#fff' : '#374151',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {a.ada}
            <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>
              {a.blok_sayisi} blok
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
