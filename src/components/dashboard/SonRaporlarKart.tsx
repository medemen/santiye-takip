import type { Rapor } from '../../types';
import ReportCard from '../ReportCard';
import { card, btnGhost } from '../../utils/styles';

interface Props {
  raporlar: Rapor[];
  grid?: boolean;
  onTumu: () => void;
}

export default function SonRaporlarKart({ raporlar, grid, onTumu }: Props) {
  return (
    <div style={{ ...card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>
          Son Raporlar
        </h3>
        <button onClick={onTumu} style={btnGhost}>
          Tümü
        </button>
      </div>
      {raporlar.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-subtle)', textAlign: 'center', padding: 20 }}>
          Henüz rapor eklenmemiş. İlk raporu eklemek için + butonuna tıklayın.
        </p>
      ) : grid ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          {raporlar.map((r) => <ReportCard key={r.id} rapor={r} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {raporlar.map((r) => <ReportCard key={r.id} rapor={r} />)}
        </div>
      )}
    </div>
  );
}
