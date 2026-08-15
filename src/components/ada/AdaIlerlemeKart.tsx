import ProgressBar from '../ProgressBar';

interface Props {
  ilerleme: number;
  onRaporEkle: () => void;
}

export default function AdaIlerlemeKart({ ilerleme, onRaporEkle }: Props) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        border: '1px solid #f0f0f0',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Ada İlerlemesi</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>%{ilerleme}</span>
      </div>
      <ProgressBar value={ilerleme} height={8} />
      <button
        onClick={onRaporEkle}
        style={{
          width: '100%',
          marginTop: 10,
          padding: '10px 12px',
          backgroundColor: 'var(--bg-accent)',
          border: 'none',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--accent-dark)',
          cursor: 'pointer',
        }}
      >
        Ada Geneli Rapor Ekle
      </button>
    </div>
  );
}
