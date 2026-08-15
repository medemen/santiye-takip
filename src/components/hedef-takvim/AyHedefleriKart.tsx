import { card } from '../../utils/styles';
import type { HedefTakvimGorunumu } from './types';

interface Props {
  ayAdi: string;
  ayHedefleri: HedefTakvimGorunumu[];
  onHedefTikla: (ada: string, blokNo: number) => void;
}

export default function AyHedefleriKart({ ayAdi, ayHedefleri, onHedefTikla }: Props) {
  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', margin: 0, marginBottom: 8 }}>
        {ayAdi} ayı hedefleri ({ayHedefleri.length})
      </h3>
      {ayHedefleri.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text-subtle)', margin: 0 }}>Bu ay için hedef tanımlanmamış.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ayHedefleri
            .slice()
            .sort((a, b) => a.hedef_tarih.localeCompare(b.hedef_tarih))
            .map((h) => (
              <div
                key={`${h.ada}-${h.blok_no}-${h.is_kalemi}`}
                onClick={() => onHedefTikla(h.ada, h.blok_no)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 10px', backgroundColor: 'var(--bg-hover)', borderRadius: 8, cursor: 'pointer', fontSize: 12, gap: 6,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {h.ada} - {h.blok_no === 0 ? 'Ada Geneli' : `Blok ${h.blok_no}`}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {h.is_kalemi}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{h.hedef_tarih}</div>
                  <div style={{ fontSize: 11, color: h.durum.renk, fontWeight: 600 }}>{h.durum.label}</div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
