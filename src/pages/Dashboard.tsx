import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIstatistikler, getAdaGenelIlerleme, getSonRapor } from '../stores/reportStore';
import { useHedefler } from '../hooks/useHedefler';
import { useRaporlar } from '../hooks/useRaporlar';
import { getHedefOzeti } from '../data/plan';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { getAdaList, getAllKalemler } from '../config/helpers';
import { DURUM_RENKLERI } from '../config/defaultConfig';
import DonutChart from '../components/DonutChart';
import BarChart from '../components/BarChart';
import ReportCard from '../components/ReportCard';
import ProgressBar from '../components/ProgressBar';
import { card, btnGhost } from '../utils/styles';

export default function Dashboard() {
  const navigate = useNavigate();
  const config = useSiteConfig();
  const raporlar = useRaporlar();
  const stats = useMemo(() => getIstatistikler(raporlar), [raporlar]);
  const sonRaporlar = useMemo(
    () =>
      raporlar
        .filter((r) => r.raporlayan !== 'DURUM TESPİT')
        .sort((a, b) => new Date(b.olusturma_tarihi).getTime() - new Date(a.olusturma_tarihi).getTime())
        .slice(0, 5),
    [raporlar]
  );
  const gecikenIsler = useMemo(() => raporlar.filter((r) => r.durum === 'gecikme'), [raporlar]);

  const hedefler = useHedefler();
  const hedefOzeti = getHedefOzeti(hedefler, (a, b, ik) => getSonRapor(a, b, ik));

  const donutData = useMemo(
    () => [
      { name: 'Tamamlandı', value: stats.tamamlananIsler, color: DURUM_RENKLERI.tamamlandi },
      { name: 'Devam Ediyor', value: stats.devamEdenIsler, color: DURUM_RENKLERI.devam_ediyor },
      { name: 'Planlandı', value: stats.planlananIsler, color: DURUM_RENKLERI.planlandi },
      { name: 'Gecikme', value: stats.gecikenIsler, color: DURUM_RENKLERI.gecikme },
    ],
    [stats]
  );

  const isKalemleri = getAllKalemler(config);
  const adalar = getAdaList(config);

  const adaProgress = useMemo(
    () =>
      adalar.map((a) => ({
        name: a.ada,
        value: getAdaGenelIlerleme(a.ada, a.bloklar, isKalemleri),
        color: '#f59e0b',
      })),
    [adalar, isKalemleri]
  );

  const genelIlerleme =
    adaProgress.length > 0
      ? Math.round(adaProgress.reduce((s, a) => s + a.value, 0) / adaProgress.length)
      : 0;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0, marginBottom: 4 }}>
          {config.genel.santiyeAdi}
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
          {config.genel.projeAdi}
        </p>
      </div>

      <div style={{ ...card, padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#4b5563' }}>Genel İlerleme</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: genelIlerleme === 100 ? '#22c55e' : '#f59e0b' }}>
            %{genelIlerleme}
          </span>
        </div>
        <ProgressBar value={genelIlerleme} height={10} />
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0 }}>
            Rapor Dağılımı
          </h3>
          <button onClick={() => navigate('/istatistik')} style={btnGhost}>
            Detaylı İstatistik →
          </button>
        </div>
        <DonutChart data={donutData} />
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 8 }}>
          Ada Bazında İlerleme
        </h3>
        <BarChart data={adaProgress} />
      </div>

      {gecikenIsler.length > 0 && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            borderRadius: 16,
            padding: 14,
            marginBottom: 16,
            border: '1px solid #fecaca',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#ef4444' }}>
              {gecikenIsler.length} Geciken İş Kalemi
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {gecikenIsler.slice(0, 5).map((r) => (
              <div
                key={r.id}
                onClick={() => navigate(r.blok_no === 0 ? `/ada/${r.ada}` : `/ada/${r.ada}/blok/${r.blok_no}`)}
                style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '6px 10px', backgroundColor: '#fff',
                  borderRadius: 8, cursor: 'pointer', fontSize: 12,
                }}
              >
                <span style={{ fontWeight: 500 }}>{r.ada} - {r.blok_no === 0 ? 'Ada Geneli' : `Blok ${r.blok_no}`}</span>
                <span style={{ color: '#ef4444' }}>{r.is_kalemi}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hedefOzeti.toplam > 0 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <button
              onClick={() => navigate('/hedef-takvim')}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontSize: 14, fontWeight: 600, color: '#4b5563',
              }}
            >
              🎯 Hedef Takvimi <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>→</span>
            </button>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{hedefOzeti.toplam} hedef</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ fontSize: 12, backgroundColor: '#f3f4f6', color: '#4b5563', padding: '3px 10px', borderRadius: 12 }}>
              ✅ {hedefOzeti.tamamlanan} tamam
            </span>
            <span style={{ fontSize: 12, backgroundColor: hedefOzeti.suresiGecen > 0 ? '#fef2f2' : '#f3f4f6', color: hedefOzeti.suresiGecen > 0 ? '#ef4444' : '#4b5563', padding: '3px 10px', borderRadius: 12, fontWeight: hedefOzeti.suresiGecen > 0 ? 700 : 400 }}>
              ⛔ {hedefOzeti.suresiGecen} süresi geçti
            </span>
            <span style={{ fontSize: 12, backgroundColor: hedefOzeti.bugun > 0 ? '#fef3c7' : '#f3f4f6', color: hedefOzeti.bugun > 0 ? '#92400e' : '#4b5563', padding: '3px 10px', borderRadius: 12, fontWeight: hedefOzeti.bugun > 0 ? 700 : 400 }}>
              📅 {hedefOzeti.bugun} bugün
            </span>
            <span style={{ fontSize: 12, backgroundColor: hedefOzeti.yediGun > 0 ? '#fef3c7' : '#f3f4f6', color: hedefOzeti.yediGun > 0 ? '#92400e' : '#4b5563', padding: '3px 10px', borderRadius: 12, fontWeight: hedefOzeti.yediGun > 0 ? 700 : 400 }}>
              ⏳ {hedefOzeti.yediGun} ≤7 gün
            </span>
          </div>
          {hedefOzeti.acil.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {hedefOzeti.acil.slice(0, 6).map((h) => (
                <div
                  key={`${h.ada}-${h.blok_no}-${h.is_kalemi}`}
                  onClick={() => navigate(h.blok_no === 0 ? `/ada/${h.ada}` : `/ada/${h.ada}/blok/${h.blok_no}`)}
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
      )}

      <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0 }}>
              Son Raporlar
            </h3>
          <button onClick={() => navigate('/raporlar')} style={btnGhost}>
            Tümü
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sonRaporlar.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: 20 }}>
              Henüz rapor eklenmemiş. İlk raporu eklemek için + butonuna tıklayın.
            </p>
          ) : (
            sonRaporlar.map((r) => <ReportCard key={r.id} rapor={r} />)
          )}
        </div>
      </div>
    </div>
  );
}
