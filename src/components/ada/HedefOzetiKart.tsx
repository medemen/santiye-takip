import type { HedefOzet } from '../../data/plan';

interface Props {
  ozet: HedefOzet;
  onHedefTikla: (ada: string, blokNo: number) => void;
}

export default function HedefOzetiKart({ ozet, onHedefTikla }: Props) {
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
        🎯 Hedef Özeti ({ozet.toplam})
      </h3>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: 12, backgroundColor: '#f3f4f6', color: '#4b5563', padding: '3px 10px', borderRadius: 12 }}>
          ✅ {ozet.tamamlanan} tamam
        </span>
        <span style={{ fontSize: 12, backgroundColor: ozet.suresiGecen > 0 ? '#fef2f2' : '#f3f4f6', color: ozet.suresiGecen > 0 ? '#ef4444' : '#4b5563', padding: '3px 10px', borderRadius: 12, fontWeight: ozet.suresiGecen > 0 ? 700 : 400 }}>
          ⛔ {ozet.suresiGecen} süresi geçti
        </span>
        <span style={{ fontSize: 12, backgroundColor: ozet.bugun > 0 ? '#fef3c7' : '#f3f4f6', color: ozet.bugun > 0 ? '#92400e' : '#4b5563', padding: '3px 10px', borderRadius: 12, fontWeight: ozet.bugun > 0 ? 700 : 400 }}>
          📅 {ozet.bugun} bugün
        </span>
        <span style={{ fontSize: 12, backgroundColor: ozet.yediGun > 0 ? '#fef3c7' : '#f3f4f6', color: ozet.yediGun > 0 ? '#92400e' : '#4b5563', padding: '3px 10px', borderRadius: 12, fontWeight: ozet.yediGun > 0 ? 700 : 400 }}>
          ⏳ {ozet.yediGun} ≤7 gün
        </span>
      </div>
      {ozet.acil.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ozet.acil.slice(0, 5).map((h) => (
            <div
              key={`${h.blok_no}-${h.is_kalemi}`}
              onClick={() => onHedefTikla(h.ada, h.blok_no)}
              style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '6px 10px', backgroundColor: '#f9fafb',
                borderRadius: 8, cursor: 'pointer', fontSize: 12,
              }}
            >
              <span style={{ fontWeight: 500 }}>
                {h.blok_no === 0 ? 'Ada Geneli' : `Blok ${h.blok_no}`}
              </span>
              <span style={{ color: '#374151' }}>{h.is_kalemi}</span>
              <span style={{ color: h.durum.renk, fontWeight: 600 }}>{h.durum.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
