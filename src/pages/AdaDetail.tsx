import { useParams, useNavigate } from 'react-router-dom';
import { useCallback, useState } from 'react';
import BlokCard from '../components/BlokCard';
import AdaIlerlemeKart from '../components/ada/AdaIlerlemeKart';
import SorumluPersonelKart from '../components/ada/SorumluPersonelKart';
import HedefOzetiKart from '../components/ada/HedefOzetiKart';
import BlokTipFilter from '../components/ada/BlokTipFilter';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useHedefler } from '../hooks/useHedefler';
import { useRaporlar } from '../hooks/useRaporlar';
import { getAda, getBloklar, getAllKalemler } from '../config/helpers';
import { getSantiyeSefi, getBlokSorumlulari } from '../stores/kullanicilarStore';
import { getAdaGenelIlerleme, getSonRapor } from '../stores/reportStore';
import { getHedefOzeti } from '../data/plan';

export default function AdaDetail() {
  const { ada } = useParams<{ ada: string }>();
  const navigate = useNavigate();
  const config = useSiteConfig();
  const [filterTip, setFilterTip] = useState('');
  useRaporlar();

  const hedefler = useHedefler();
  const hedefOzeti = getHedefOzeti(
    hedefler.filter((h) => h.ada === ada),
    (a, b, ik) => getSonRapor(a, b, ik)
  );

  const adaData = getAda(config, ada!);
  const bloklar = getBloklar(config, ada!);
  const ilerleme = getAdaGenelIlerleme(ada!, bloklar, getAllKalemler(config));
  const blokNavigate = useCallback(
    (blokNo: number) => navigate(`/ada/${ada}/blok/${blokNo}`),
    [navigate, ada]
  );

  if (!adaData) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Ada bulunamadı</div>;
  }

  const santiyeSefi = getSantiyeSefi(ada!);
  const sorumlular = getBlokSorumlulari(ada!);
  const hedefeGit = (hAda: string, blokNo: number) => {
    navigate(blokNo === 0 ? `/ada/${hAda}` : `/ada/${hAda}/blok/${blokNo}`);
  };

  const filteredBloklar = filterTip
    ? bloklar.filter((b) => b.tip === filterTip)
    : bloklar;

  return (
    <div>
      <button
        onClick={() => navigate('/adalar')}
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
        ← Adalara Dön
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0, marginBottom: 4 }}>
        {ada}
      </h1>
      <p style={{ fontSize: 13, color: '#6b7280', margin: 0, marginBottom: 12 }}>
        Şantiye Şefi: {santiyeSefi} | {bloklar.length} Blok, {adaData.toplam_daire} Daire, {adaData.toplam_kat} Kat
      </p>

      <AdaIlerlemeKart
        ilerleme={ilerleme}
        onRaporEkle={() => navigate(`/rapor-ekle?ada=${ada}&blok=0`)}
      />

      <SorumluPersonelKart sorumlular={sorumlular} />

      {hedefOzeti.toplam > 0 && (
        <HedefOzetiKart ozet={hedefOzeti} onHedefTikla={hedefeGit} />
      )}

      <div style={{ marginBottom: 16 }}>
        <BlokTipFilter bloklar={bloklar} seciliTip={filterTip} onTipSec={setFilterTip} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredBloklar.map((blok) => (
          <BlokCard
            key={blok.blok_no}
            ada={ada!}
            blok={blok}
            onClick={blokNavigate}
          />
        ))}
      </div>
    </div>
  );
}
