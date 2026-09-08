import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIstatistikler, getGenelIlerleme, getProjeAgirlikliIlerleme, getSahaAdaIlerleme } from '../stores/reportStore';
import { useRaporlar } from '../hooks/useRaporlar';
import { getAllPersonel } from '../stores/kullanicilarStore';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { getAdaList, getAllKalemler } from '../config/helpers';
import { adaDurumSayilari, durumDonutVerisi, BOS_ADA_SAYISI } from '../data/istatistik';
import GenelIlerlemeKart from '../components/istatistik/GenelIlerlemeKart';
import RaporDagilimiKart from '../components/istatistik/RaporDagilimiKart';
import AdaBazindaIlerlemeKart from '../components/istatistik/AdaBazindaIlerlemeKart';
import AdaDetayKart from '../components/istatistik/AdaDetayKart';
import PersonelSiralamasiKart from '../components/istatistik/PersonelSiralamasiKart';
import { btnGhost, pageTitle } from '../utils/styles';

export default function Statistics() {
  const navigate = useNavigate();
  const config = useSiteConfig();
  const raporlar = useRaporlar();
  const stats = useMemo(() => getIstatistikler(raporlar), [raporlar]);
  const isKalemleri = getAllKalemler(config);
  const adalar = getAdaList(config);

  const donutData = useMemo(
    () =>
      durumDonutVerisi({
        tamamlananIsler: stats.tamamlananIsler,
        devamEdenIsler: stats.devamEdenIsler,
        planlananIsler: stats.planlananIsler,
        gecikenIsler: stats.gecikenIsler,
      }),
    [stats]
  );

  const adaDetay = useMemo(() => {
    const sayilar = adaDurumSayilari(raporlar);
    return adalar.map((a) => {
      const s = sayilar.get(a.ada) ?? BOS_ADA_SAYISI;
      return {
        ada: a.ada,
        ...s,
        ilerleme: getSahaAdaIlerleme(a.ada, a.bloklar, isKalemleri),
      };
    });
  }, [raporlar, adalar, isKalemleri]);

  const adaProgress = useMemo(
    () => adaDetay.map((a) => ({ name: a.ada, value: a.ilerleme, color: '#f59e0b' })),
    [adaDetay]
  );

  const personelRaporSiralamasi = useMemo(() => {
    const sayilar = new Map<string, number>();
    for (const r of raporlar) {
      sayilar.set(r.raporlayan, (sayilar.get(r.raporlayan) ?? 0) + 1);
    }
    return getAllPersonel()
      .map((p) => ({
        ad_soyad: p.ad_soyad,
        raporSayisi: sayilar.get(p.ad_soyad) ?? 0,
      }))
      .sort((a, b) => b.raporSayisi - a.raporSayisi)
      .slice(0, 10);
  }, [raporlar]);

  const genelIlerleme = Math.round(getProjeAgirlikliIlerleme(adalar) ?? getGenelIlerleme(adalar, isKalemleri));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={pageTitle}>İstatistikler</h1>
        <button onClick={() => navigate('/')} style={btnGhost}>
          ← Dashboard
        </button>
      </div>

      <GenelIlerlemeKart ilerleme={genelIlerleme} />

      <RaporDagilimiKart
        donutData={donutData}
        tamamlanan={stats.tamamlananIsler}
        devam={stats.devamEdenIsler}
        plan={stats.planlananIsler}
        gecikme={stats.gecikenIsler}
      />

      <AdaBazindaIlerlemeKart data={adaProgress} />

      <AdaDetayKart adalar={adaDetay} onAdaTikla={(ada) => navigate(`/ada/${ada}`)} />

      <PersonelSiralamasiKart personeller={personelRaporSiralamasi} />
    </div>
  );
}
