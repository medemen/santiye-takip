import type { Rapor } from '../../types';
import { card } from '../../utils/styles';

export interface YaklasanHedef {
  ada: string;
  blok_no: number;
  is_kalemi: string;
  hedef_tarih: string;
  kalanGun: number;
  rapor: Rapor | null;
}

interface Props {
  hedefler: YaklasanHedef[];
  onNavigate: (ada: string, blokNo: number) => void;
}

export default function YaklasanKart({ hedefler, onNavigate }: Props) {
  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 10 }}>
        ⏰ Yaklaşan Hedefler
      </h3>
      {hedefler.length === 0 ? (
        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Sonraki 14 gün içinde hedef yok. 🎉</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {hedefler.map((h) => (
            <div
              key={`${h.ada}-${h.blok_no}-${h.is_kalemi}`}
              onClick={() => onNavigate(h.ada, h.blok_no)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 10px', backgroundColor: '#f9fafb', borderRadius: 8, cursor: 'pointer',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {h.ada} - {h.blok_no === 0 ? 'Ada Geneli' : `Blok ${h.blok_no}`}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {h.is_kalemi} • {h.hedef_tarih}
                </div>
              </div>
              <span
                style={{
                  flexShrink: 0,
                  marginLeft: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 10,
                  backgroundColor: h.kalanGun === 0 ? '#fef2f2' : h.kalanGun <= 7 ? '#fef3c7' : '#dbeafe',
                  color: h.kalanGun === 0 ? '#ef4444' : h.kalanGun <= 7 ? '#92400e' : '#1d4ed8',
                }}
              >
                {h.kalanGun === 0 ? 'Bugün' : `${h.kalanGun} gün`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
