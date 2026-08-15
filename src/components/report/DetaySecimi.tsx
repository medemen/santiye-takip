interface Props {
  aciklama: string;
  onAciklamaDegis: (v: string) => void;
  tarih: string;
  onTarihDegis: (v: string) => void;
  raporlayan: string;
}

export default function DetaySecimi({
  aciklama,
  onAciklamaDegis,
  tarih,
  onTarihDegis,
  raporlayan,
}: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#4b5563', marginBottom: 6 }}>
          Açıklama
        </label>
        <textarea
          value={aciklama}
          onChange={(e) => onAciklamaDegis(e.target.value)}
          placeholder="İşin durumu hakkında notlar..."
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            fontSize: 13,
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#4b5563', marginBottom: 6 }}>
            Tarih
          </label>
          <input
            type="date"
            value={tarih}
            onChange={(e) => onTarihDegis(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#4b5563', marginBottom: 6 }}>
            Raporlayan
          </label>
          <input
            type="text"
            value={raporlayan}
            readOnly
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              fontSize: 13,
              backgroundColor: '#f9fafb',
              color: '#374151',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
    </div>
  );
}
