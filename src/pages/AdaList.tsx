import { useNavigate } from 'react-router-dom';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { getAdaList } from '../config/helpers';
import AdaCard from '../components/AdaCard';

export default function AdaList() {
  const navigate = useNavigate();
  const config = useSiteConfig();

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
        Adalar
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {getAdaList(config).map((ada) => (
          <AdaCard
            key={ada.ada}
            ada={ada.ada}
            blokSayisi={ada.bloklar.length}
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
