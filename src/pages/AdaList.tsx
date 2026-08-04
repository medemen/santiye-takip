import { useNavigate } from 'react-router-dom';
import { blokData } from '../data/blokData';
import AdaCard from '../components/AdaCard';

export default function AdaList() {
  const navigate = useNavigate();

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 16 }}>
        Adalar
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {blokData.adalar.map((ada) => (
          <AdaCard
            key={ada.ada}
            ada={ada.ada}
            blokSayisi={ada.blok_sayisi}
            toplamDaire={ada.toplam_daire}
            toplamKat={ada.toplam_kat}
            bloklar={ada.bloklar}
            onClick={() => navigate(`/ada/${ada.ada}`)}
          />
        ))}
      </div>
    </div>
  );
}
