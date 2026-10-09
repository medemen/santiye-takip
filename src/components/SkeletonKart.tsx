import { card } from '../utils/styles';

interface SkeletonKartProps {
  satirSayisi?: number;
  baslikGenisligi?: number;
}

export function SkeletonKart({ satirSayisi = 3, baslikGenisligi = 40 }: SkeletonKartProps) {
  return (
    <div style={{ ...card }}>
      <div className="iskelet" style={{ height: 14, width: `${baslikGenisligi}%`, marginBottom: 14 }} />
      {Array.from({ length: satirSayisi }).map((_, i) => (
        <div
          key={i}
          className="iskelet"
          style={{ height: 12, width: `${90 - i * 12}%`, marginBottom: 10 }}
        />
      ))}
    </div>
  );
}

// Sayfa ilk veri çekimini beklerken düz "Yükleniyor..." metni yerine iskelet
// gövde gösterilir; algılanan yüklenme süresini kısaltır.
export function SkeletonSayfa({ kartSayisi = 4 }: { kartSayisi?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label="Yükleniyor">
      <div className="iskelet" style={{ height: 24, width: 180, marginBottom: 20 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {Array.from({ length: kartSayisi }).map((_, i) => (
          <SkeletonKart key={i} satirSayisi={3} />
        ))}
      </div>
    </div>
  );
}
