import { useNavigate } from 'react-router-dom';
import GroupedBarChart from '../GroupedBarChart';
import { card, btnGhost } from '../../utils/styles';

export interface HakedisKarsilastirmaSatir {
  ada: string;
  uygulama: number | null;
  resmi: number | null;
  pursantaj: number;
}

interface Props {
  satirlar: HakedisKarsilastirmaSatir[];
  hakedisNo?: number;
  ozet: { uygulama: number | null; resmi: number | null };
}

export default function HakedisKarsilastirmaKart({ satirlar, hakedisNo, ozet }: Props) {
  const navigate = useNavigate();

  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>
          Hakediş Karşılaştırma{hakedisNo ? ` (${hakedisNo}.)` : ''}
        </h3>
        <button onClick={() => navigate('/hakedis')} style={btnGhost}>
          Detay →
        </button>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: 0, marginBottom: 10 }}>
        Saha (uygulama) ile hakediş (resmi) ilerleme karşılaştırması
      </p>

      {ozet.uygulama !== null && ozet.resmi !== null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 10,
            marginBottom: 12,
            backgroundColor:
              ozet.uygulama - ozet.resmi > 2
                ? 'var(--bg-success)'
                : ozet.uygulama - ozet.resmi < -2
                  ? 'var(--bg-danger)'
                  : 'var(--bg-subtle)',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Genel</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b' }}>Uygulama %{Math.round(ozet.uygulama * 10) / 10}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6' }}>Resmi %{Math.round(ozet.resmi * 10) / 10}</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: ozet.uygulama - ozet.resmi > 0 ? '#22c55e' : ozet.uygulama - ozet.resmi < 0 ? '#ef4444' : 'var(--text-faint)',
            }}
          >
            {ozet.uygulama - ozet.resmi > 0 ? '+' : ''}
            {Math.round((ozet.uygulama - ozet.resmi) * 10) / 10} pp
          </span>
        </div>
      )}

      <GroupedBarChart
        veri={satirlar.map((s) => ({ label: s.ada, uygulama: s.uygulama, resmi: s.resmi }))}
        height={170}
      />
    </div>
  );
}
