interface Props {
  suresiGecen: number;
  bugunku: number;
  haftaUcunda: number;
  tamamlanan: number;
}

export default function OzetChipSatiri({ suresiGecen, bugunku, haftaUcunda, tamamlanan }: Props) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
      <span style={{ fontSize: 12, backgroundColor: 'var(--bg-danger)', color: '#ef4444', padding: '3px 10px', borderRadius: 12, fontWeight: suresiGecen > 0 ? 700 : 400 }}>
        ⛔ {suresiGecen} geçmiş
      </span>
      <span style={{ fontSize: 12, backgroundColor: bugunku > 0 ? 'var(--bg-accent)' : 'var(--bg-subtle)', color: bugunku > 0 ? 'var(--accent-dark)' : 'var(--text-muted)', padding: '3px 10px', borderRadius: 12, fontWeight: bugunku > 0 ? 700 : 400 }}>
        📅 {bugunku} bugün
      </span>
      <span style={{ fontSize: 12, backgroundColor: haftaUcunda > 0 ? 'var(--bg-accent)' : 'var(--bg-subtle)', color: haftaUcunda > 0 ? 'var(--accent-dark)' : 'var(--text-muted)', padding: '3px 10px', borderRadius: 12, fontWeight: haftaUcunda > 0 ? 700 : 400 }}>
        ⏳ {haftaUcunda} ≤7 gün
      </span>
      <span style={{ fontSize: 12, backgroundColor: 'var(--bg-success)', color: '#16a34a', padding: '3px 10px', borderRadius: 12 }}>
        ✅ {tamamlanan} tamam
      </span>
    </div>
  );
}
