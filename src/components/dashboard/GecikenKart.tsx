import type { Rapor } from '../../types';

interface Props {
  isler: Rapor[];
  onNavigate: (ada: string, blokNo: number) => void;
}

export default function GecikenKart({ isler, onNavigate }: Props) {
  return (
    <div
      style={{
        backgroundColor: '#fef2f2',
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
        border: '1px solid #fecaca',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>⚠️</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#ef4444' }}>
          {isler.length} Geciken İş Kalemi
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {isler.slice(0, 5).map((r) => (
          <div
            key={r.id}
            onClick={() => onNavigate(r.ada, r.blok_no)}
            style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '6px 10px', backgroundColor: '#fff',
              borderRadius: 8, cursor: 'pointer', fontSize: 12,
            }}
          >
            <span style={{ fontWeight: 500 }}>{r.ada} - {r.blok_no === 0 ? 'Ada Geneli' : `Blok ${r.blok_no}`}</span>
            <span style={{ color: '#ef4444' }}>{r.is_kalemi}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
