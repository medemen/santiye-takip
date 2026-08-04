import { useNavigate } from 'react-router-dom';
import { getIstatistikler, getAdaRaporlari, getAdaGenelIlerleme, getPersonelRaporlari } from '../store/reportStore';
import { blokData } from '../data/blokData';
import { personelData } from '../data/personelData';
import { IS_KALEMLERI, DURUM_RENKLERI } from '../data/isKalemleri';
import DonutChart from '../components/DonutChart';
import BarChart from '../components/BarChart';
import { card, btnGhost, pageTitle } from '../utils/styles';

export default function Statistics() {
  const navigate = useNavigate();
  const stats = getIstatistikler();

  const donutData = [
    { name: 'Tamamlandı', value: stats.tamamlananIsler, color: DURUM_RENKLERI.tamamlandi },
    { name: 'Devam Ediyor', value: stats.devamEdenIsler, color: DURUM_RENKLERI.devam_ediyor },
    { name: 'Planlandı', value: stats.planlananIsler, color: DURUM_RENKLERI.planlandi },
    { name: 'Gecikme', value: stats.gecikenIsler, color: DURUM_RENKLERI.gecikme },
  ];

  const adaProgress = blokData.adalar.map((a) => ({
    name: a.ada,
    value: getAdaGenelIlerleme(a.ada, a.bloklar, IS_KALEMLERI),
    color: '#f59e0b',
  }));

  const adaDetay = blokData.adalar.map((a) => {
    const raporlar = getAdaRaporlari(a.ada);
    return {
      ada: a.ada,
      toplam: raporlar.length,
      tamam: raporlar.filter((r) => r.durum === 'tamamlandi').length,
      devam: raporlar.filter((r) => r.durum === 'devam_ediyor').length,
      gecikme: raporlar.filter((r) => r.durum === 'gecikme').length,
      plan: raporlar.filter((r) => r.durum === 'planlandi').length,
      ilerleme: getAdaGenelIlerleme(a.ada, a.bloklar, IS_KALEMLERI),
    };
  });

  const personelRaporSiralamasi = personelData.personel
    .map((p) => ({
      ad_soyad: p.ad_soyad,
      raporSayisi: getPersonelRaporlari(p.ad_soyad).length,
    }))
    .sort((a, b) => b.raporSayisi - a.raporSayisi)
    .slice(0, 10);

  const genelIlerleme =
    blokData.adalar.length > 0
      ? Math.round(
          blokData.adalar.reduce(
            (s, a) => s + getAdaGenelIlerleme(a.ada, a.bloklar, IS_KALEMLERI),
            0
          ) / blokData.adalar.length
        )
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
