interface Props {
  sorumlular: string[];
}

export default function SorumluPersonelKart({ sorumlular }: Props) {
  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        border: '1px solid #f0f0f0',
      }}
    >
      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 8 }}>
        Sorumlu Personel ({sorumlular.length})
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {sorumlular.map((p) => (
          <span
            key={p}
            style={{
              fontSize: 12,
              backgroundColor: '#fef3c7',
              color: '#92400e',
              padding: '3px 10px',
              borderRadius: 12,
            }}
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
