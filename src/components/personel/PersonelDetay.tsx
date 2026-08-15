import type { Rapor } from '../../types';
import ReportCard from '../ReportCard';

interface Props {
  ad_soyad: string;
  raporlar: Rapor[];
  adaAtamasi: string | null;
  onGeri: () => void;
}

export default function PersonelDetay({ ad_soyad, raporlar, adaAtamasi, onGeri }: Props) {
  return (
    <div>
      <button
        onClick={onGeri}
        style={{
          background: 'none',
          border: 'none',
          color: '#f59e0b',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          padding: 0,
          marginBottom: 12,
        }}
      >
        ← Personele Dön
      </button>

      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>
        {ad_soyad}
      </h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        {adaAtamasi
          ? `${adaAtamasi} — Toplam ${raporlar.length} rapor`
          : `Atanmamış — Toplam ${raporlar.length} rapor`}
      </p>

      {raporlar.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14 }}>
          Henüz rapor bulunmuyor
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {raporlar.map((r) => (
            <ReportCard key={r.id} rapor={r} />
          ))}
        </div>
      )}
    </div>
  );
}
