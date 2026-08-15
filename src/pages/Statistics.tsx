import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIstatistikler, getAdaGenelIlerleme } from '../stores/reportStore';
import { useRaporlar } from '../hooks/useRaporlar';
import { getAllPersonel } from '../stores/kullanicilarStore';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { getAdaList, getAllKalemler } from '../config/helpers';
import { DURUM_RENKLERI } from '../config/defaultConfig';
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
    () => [
      { name: 'Tamamlandı', value: stats.tamamlananIsler, color: DURUM_RENKLERI.tamamlandi },
      { name: 'Devam Ediyor', value: stats.devamEdenIsler, color: DURUM_RENKLERI.devam_ediyor },
      { name: 'Planlandı', value: stats.planlananIsler, color: DURUM_RENKLERI.planlandi },
      { name: 'Gecikme', value: stats.gecikenIsler, color: DURUM_RENKLERI.gecikme },
    ],
    [stats]
  );

  const adaDetay = useMemo(() => {
    const adaSayilari = new Map<string, { toplam: number; tamam: number; devam: number; gecikme: number; plan: number }>();
    for (const r of raporlar) {
      let s = adaSayilari.get(r.ada);
      if (!s) {
        s = { toplam: 0, tamam: 0, devam: 0, gecikme: 0, plan: 0 };
        adaSayilari.set(r.ada, s);
      }
      s.toplam++;
      if (r.durum === 'tamamlandi') s.tamam++;
      else if (r.durum === 'devam_ediyor') s.devam++;
      else if (r.durum === 'gecikme') s.gecikme++;
      else if (r.durum === 'planlandi') s.plan++;
    }
    return adalar.map((a) => {
      const s = adaSayilari.get(a.ada) ?? { toplam: 0, tamam: 0, devam: 0, gecikme: 0, plan: 0 };
      return {
        ada: a.ada,
        ...s,
        ilerleme: getAdaGenelIlerleme(a.ada, a.bloklar, isKalemleri),
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

  const genelIlerleme =
    adaDetay.length > 0
      ? Math.round(adaDetay.reduce((s, a) => s + a.ilerleme, 0) / adaDetay.length)
      : 0;

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
