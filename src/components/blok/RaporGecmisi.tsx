import type { Rapor } from '../../types';
import ReportCard from '../ReportCard';

interface Props {
  raporlar: Rapor[];
}

export default function RaporGecmisi({ raporlar }: Props) {
  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #f0f0f0',
      }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 12 }}>
        Rapor Geçmişi ({raporlar.length})
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {raporlar.map((r) => (
          <ReportCard key={r.id} rapor={r} />
        ))}
      </div>
    </div>
  );
}
