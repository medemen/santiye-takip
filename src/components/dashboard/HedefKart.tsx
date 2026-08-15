import type { HedefOzet } from '../../data/plan';
import { card } from '../../utils/styles';

interface Props {
  ozet: HedefOzet;
  onNavigate: (ada: string, blokNo: number) => void;
  onHedefTakvim: () => void;
}

export default function HedefKart({ ozet, onNavigate, onHedefTakvim }: Props) {
  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button
          onClick={onHedefTakvim}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontSize: 14, fontWeight: 600, color: '#4b5563',
          }}
        >
          🎯 Hedef Takvimi <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>→</span>
        </button>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{ozet.toplam} hedef</span>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
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

      {ozet.acil.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ozet.acil.slice(0, 6).map((h) => (
            <div
              key={`${h.ada}-${h.blok_no}-${h.is_kalemi}`}
              onClick={() => onNavigate(h.ada, h.blok_no)}
              style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '6px 10px', backgroundColor: '#f9fafb',
                borderRadius: 8, cursor: 'pointer', fontSize: 12,
              }}
            >
              <span style={{ fontWeight: 500 }}>{h.ada} - {h.blok_no === 0 ? 'Ada Geneli' : `Blok ${h.blok_no}`}</span>
              <span style={{ color: '#374151' }}>{h.is_kalemi}</span>
              <span style={{ color: h.durum.renk, fontWeight: 600 }}>{h.durum.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Tüm hedefler yolunda, acil iş yok. 🎉</p>
      )}
    </div>
  );
}
