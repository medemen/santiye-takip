interface Props {
  ilerleme: number;
  onChange: (v: number) => void;
}

export default function IlerlemeSecimi({ ilerleme, onChange }: Props) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>İlerleme: %{ilerleme}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 25, 50, 75, 100].map((p) => (
            <button
              key={p}
              onClick={() => onChange(p)}
              style={{
                padding: '2px 8px',
                backgroundColor: ilerleme === p ? 'var(--bg-accent)' : 'var(--bg-hover)',
                border: ilerleme === p ? '1px solid #f59e0b' : '1px solid #e5e7eb',
                borderRadius: 6,
                fontSize: 11,
                color: ilerleme === p ? 'var(--accent-dark)' : 'var(--text-faint)',
                cursor: 'pointer',
              }}
            >
              %{p}
            </button>
          ))}
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={ilerleme}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{ width: '100%' }}
      />
    </div>
  );
}
