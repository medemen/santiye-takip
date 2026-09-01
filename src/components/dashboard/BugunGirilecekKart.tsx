import type { GirilecekOge } from '../../data/bugunGirilecek';
import { card } from '../../utils/styles';
import { DURUM_LABELLARI } from '../../config/defaultConfig';

interface Props {
  ogeler: GirilecekOge[];
  onRaporEkle: (ada: string, isKalemi: string) => void;
}

export default function BugunGirilecekKart({ ogeler, onRaporEkle }: Props) {
  return (
    <div style={{ ...card, padding: 16, border: '1px solid var(--border-soft)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>
          ✅ Bugün Girilecek
        </h3>
        {ogeler.length > 0 && (
          <span
            style={{
              fontSize: 11, fontWeight: 700, color: '#fff', backgroundColor: '#f59e0b',
              borderRadius: 999, padding: '2px 8px',
            }}
          >
            {ogeler.length}
          </span>
        )}
      </div>

      {ogeler.length === 0 ? (
        <p style={{ fontSize: 13, color: '#16a34a', margin: 0, fontWeight: 500 }}>
          🎉 Bugün bekleyen rapor girişi yok.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ogeler.map((o) => (
            <div
              key={`${o.ada}|${o.is_kalemi}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '10px 12px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 10,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {o.ada} · {o.is_kalemi}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                  Son: {o.sonTarih} · %{o.sonIlerleme}
                  {DURUM_LABELLARI[o.durum] ? ` · ${DURUM_LABELLARI[o.durum]}` : ''}
                </div>
              </div>
              <button
                onClick={() => onRaporEkle(o.ada, o.is_kalemi)}
                style={{
                  flexShrink: 0,
                  padding: '8px 12px',
                  backgroundColor: '#f59e0b',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#fff',
                  cursor: 'pointer',
                  minHeight: 44,
                }}
              >
                Rapor Ekle ➕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
