interface Props {
  onRaporEkle: () => void;
  onRaporlariGor: () => void;
}

export default function BlokEylemler({ onRaporEkle, onRaporlariGor }: Props) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
      <button
        onClick={onRaporEkle}
        style={{
          flex: 1,
          padding: '12px 20px',
          backgroundColor: '#f59e0b',
          color: '#fff',
          border: 'none',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        + Rapor Ekle
      </button>
      <button
        onClick={onRaporlariGor}
        style={{
          flex: 1,
          padding: '12px 20px',
          backgroundColor: '#f3f4f6',
          color: '#4b5563',
          border: 'none',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Raporları Gör
      </button>
    </div>
  );
}
