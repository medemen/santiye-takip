import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIstatistikler, getAdaGenelIlerleme } from '../stores/reportStore';
import { useRaporlar } from '../hooks/useRaporlar';
import { getAllPersonel } from '../stores/kullanicilarStore';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { getAdaList, getAllKalemler } from '../config/helpers';
import { DURUM_RENKLERI } from '../config/defaultConfig';
import DonutChart from '../components/DonutChart';
import BarChart from '../components/BarChart';
import { card, btnGhost, pageTitle } from '../utils/styles';

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

      <div style={{ ...card, padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#4b5563' }}>Genel İlerleme</span>
          <span style={{ fontSize: 28, fontWeight: 700, color: genelIlerleme === 100 ? '#22c55e' : '#f59e0b' }}>
            %{genelIlerleme}
          </span>
        </div>
        <div
          style={{
            height: 10,
            borderRadius: 5,
            backgroundColor: '#e5e7eb',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${genelIlerleme}%`,
              height: '100%',
              borderRadius: 5,
              backgroundColor: genelIlerleme === 100 ? '#22c55e' : '#f59e0b',
              transition: 'width 0.5s',
            }}
          />
        </div>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 8 }}>
          Rapor Dağılımı
        </h3>
        <DonutChart data={donutData} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginTop: 12,
          }}
        >
          <div style={{ backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>{stats.tamamlananIsler}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Tamamlandı</div>
          </div>
          <div style={{ backgroundColor: '#eff6ff', borderRadius: 8, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>{stats.devamEdenIsler}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Devam Ediyor</div>
          </div>
          <div style={{ backgroundColor: '#fefce8', borderRadius: 8, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>{stats.planlananIsler}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Planlandı</div>
          </div>
          <div style={{ backgroundColor: '#fef2f2', borderRadius: 8, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{stats.gecikenIsler}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Gecikme</div>
          </div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 8 }}>
          Ada Bazında İlerleme
        </h3>
        <BarChart data={adaProgress} />
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 12 }}>
          Ada Detay
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {adaDetay.map((a) => (
            <div
              key={a.ada}
              onClick={() => navigate(`/ada/${a.ada}`)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                backgroundColor: '#f8fafc',
                borderRadius: 10,
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{a.ada}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  {a.toplam} rapor • %{a.ilerleme}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                <span style={{ color: '#22c55e' }}>✅{a.tamam}</span>
                <span style={{ color: '#3b82f6' }}>🔵{a.devam}</span>
                <span style={{ color: '#ef4444' }}>⚠️{a.gecikme}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {personelRaporSiralamasi.length > 0 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 12 }}>
            En Çok Raporlayan Personel
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {personelRaporSiralamasi.map((p, i) => (
              <div
                key={p.ad_soyad}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  backgroundColor: i === 0 ? '#fef3c7' : '#f9fafb',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1f2937' }}>
                  {i === 0 && '🥇 '}{i === 1 && '🥈 '}{i === 2 && '🥉 '}
                  {p.ad_soyad}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>{p.raporSayisi}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
