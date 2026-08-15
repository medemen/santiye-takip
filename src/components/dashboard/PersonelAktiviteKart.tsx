import { card } from '../../utils/styles';

export interface AktiviteKisi {
  ad_soyad: string;
  raporSayisi: number;
}

interface Props {
  kisiler: AktiviteKisi[];
}

export default function PersonelAktiviteKart({ kisiler }: Props) {
  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', margin: 0, marginBottom: 12 }}>
        Son 7 Gün Personel Aktivitesi
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {kisiler.map((p, i) => (
          <div
            key={p.ad_soyad}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              backgroundColor: i === 0 ? 'var(--bg-accent)' : 'var(--bg-hover)',
              borderRadius: 8,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
              {i === 0 && '🥇 '}{i === 1 && '🥈 '}{i === 2 && '🥉 '}
              {p.ad_soyad}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>{p.raporSayisi} rapor</div>
          </div>
        ))}
      </div>
    </div>
  );
}
