import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIstatistikler, getAdaGenelIlerleme } from '../stores/reportStore';
import { useHedefler } from '../hooks/useHedefler';
import { useRaporlar } from '../hooks/useRaporlar';
import { getHedefOzeti } from '../data/plan';
import type { Rapor } from '../types';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { getAdaList, getAllKalemler } from '../config/helpers';
import { DURUM_RENKLERI } from '../config/defaultConfig';
import { getAllPersonel } from '../stores/kullanicilarStore';
import DonutChart from '../components/DonutChart';
import BarChart from '../components/BarChart';
import ReportCard from '../components/ReportCard';
import ProgressBar from '../components/ProgressBar';
import { card, btnGhost } from '../utils/styles';

function KpiCard({ label, value, color, progress }: { label: string; value: string | number; color: string; progress?: number }) {
  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      {progress !== undefined && (
        <div style={{ marginTop: 8 }}>
          <ProgressBar value={progress} height={8} />
        </div>
      )}
    </div>
  );
}

const grid2 = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginBottom: 16 };

export default function Dashboard() {
  const navigate = useNavigate();
  const config = useSiteConfig();
  const isDesktop = useIsDesktop();
  const raporlar = useRaporlar();
  const stats = useMemo(() => getIstatistikler(raporlar), [raporlar]);
  const sonRaporlar = useMemo(
    () =>
      raporlar
        .filter((r) => r.raporlayan !== 'DURUM TESPİT')
        .sort((a, b) => new Date(b.olusturma_tarihi).getTime() - new Date(a.olusturma_tarihi).getTime())
        .slice(0, 6),
    [raporlar]
  );
  const gecikenIsler = useMemo(() => raporlar.filter((r) => r.durum === 'gecikme'), [raporlar]);

  const hedefler = useHedefler();
  const hedefOzeti = useMemo(() => {
    const sonRaporlarMap = new Map<string, Rapor>();
    for (const r of raporlar) {
      const anahtar = `${r.ada}|${r.blok_no}|${r.is_kalemi}`;
      const mevcut = sonRaporlarMap.get(anahtar);
      if (!mevcut || new Date(r.olusturma_tarihi).getTime() > new Date(mevcut.olusturma_tarihi).getTime()) {
        sonRaporlarMap.set(anahtar, r);
      }
    }
    return getHedefOzeti(hedefler, (a, b, ik) => sonRaporlarMap.get(`${a}|${b}|${ik}`) ?? null);
  }, [hedefler, raporlar]);

  const donutData = useMemo(
    () => [
      { name: 'Tamamlandı', value: stats.tamamlananIsler, color: DURUM_RENKLERI.tamamlandi },
      { name: 'Devam Ediyor', value: stats.devamEdenIsler, color: DURUM_RENKLERI.devam_ediyor },
      { name: 'Planlandı', value: stats.planlananIsler, color: DURUM_RENKLERI.planlandi },
      { name: 'Gecikme', value: stats.gecikenIsler, color: DURUM_RENKLERI.gecikme },
    ],
    [stats]
  );

  const isKalemleri = useMemo(() => getAllKalemler(config), [config]);
  const adalar = useMemo(() => getAdaList(config), [config]);

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

  const hedefKartlari = (
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
  );

  const hedefAcilListe = (
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
  );

  const gecikenKart = (
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
  );

  const personelSiralamasiKart = personelRaporSiralamasi.length > 0 && (
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
  );

  const hedefKart = hedefOzeti.toplam > 0 && (
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
      {hedefKartlari}
      {hedefOzeti.acil.length > 0 ? (
        hedefAcilListe
      ) : (
        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Tüm hedefler yolunda, acil iş yok. 🎉</p>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0, marginBottom: 4 }}>
              {config.genel.santiyeAdi}
            </h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
              {config.genel.projeAdi}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate('/hedef-takvim')}
              style={{
                ...btnGhost,
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '8px 14px',
              }}
            >
              📅 Hedef Takvimi
            </button>
            <button
              onClick={() => navigate('/istatistik')}
              style={{
                backgroundColor: '#f59e0b',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📈 Detaylı İstatistik
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
          <KpiCard label="Genel İlerleme" value={`%${genelIlerleme}`} color={genelIlerleme === 100 ? '#22c55e' : '#f59e0b'} progress={genelIlerleme} />
          <KpiCard label="Toplam Rapor" value={stats.toplamRapor} color="#6b7280" />
          <KpiCard label="Tamamlandı" value={stats.tamamlananIsler} color="#22c55e" />
          <KpiCard label="Devam Ediyor" value={stats.devamEdenIsler} color="#3b82f6" />
          <KpiCard label="Planlandı" value={stats.planlananIsler} color="#f59e0b" />
          <KpiCard label="Gecikme" value={stats.gecikenIsler} color="#ef4444" />
        </div>

        <div style={grid2}>
          <div style={{ ...card }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 8 }}>
              Rapor Dağılımı
            </h3>
            <DonutChart data={donutData} />
          </div>
          <div style={{ ...card }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 8 }}>
              Ada Bazında İlerleme
            </h3>
            <BarChart data={adaProgress} height={240} />
          </div>
        </div>

        {gecikenIsler.length > 0 && gecikenKart}

        <div style={{ ...card, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 10 }}>
            Ada Detay
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr 1fr 1fr 1.6fr', gap: 8, padding: '8px 12px', fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
              <span>Ada</span>
              <span>Rapor</span>
              <span>Tamam</span>
              <span>Devam</span>
              <span>Gecikme</span>
              <span>İlerleme</span>
            </div>
            {adaDetay.map((a) => (
              <div
                key={a.ada}
                onClick={() => navigate(`/ada/${a.ada}`)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 0.8fr 1fr 1fr 1fr 1.6fr',
                  gap: 8,
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderTop: '1px solid #f0f0f0',
                  fontSize: 13,
                  cursor: 'pointer',
                  backgroundColor: '#fff',
                }}
              >
                <span style={{ fontWeight: 600, color: '#1f2937' }}>{a.ada}</span>
                <span style={{ color: '#6b7280' }}>{a.toplam}</span>
                <span style={{ color: '#22c55e' }}>✅ {a.tamam}</span>
                <span style={{ color: '#3b82f6' }}>🔵 {a.devam}</span>
                <span style={{ color: '#ef4444' }}>⚠️ {a.gecikme}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <ProgressBar value={a.ilerleme} height={8} />
                  </div>
                  <span style={{ fontWeight: 600, color: '#4b5563', width: 40, textAlign: 'right' }}>%{a.ilerleme}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${([hedefKart, personelSiralamasiKart].filter(Boolean)).length}, minmax(0, 1fr))`, gap: 16, marginBottom: 16 }}>
          {hedefKart}
          {personelSiralamasiKart}
        </div>

        <div style={{ ...card }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0 }}>
              Son Raporlar
            </h3>
            <button onClick={() => navigate('/raporlar')} style={btnGhost}>
              Tümü
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
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

      <button
        onClick={() => navigate('/hedef-takvim')}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          width: '100%', background: '#fff', border: '1px solid #e5e7eb',
          borderRadius: 12, padding: '14px 16px', marginBottom: 16, cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#4b5563' }}>📅 Hedef Takvimi</span>
        <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>→</span>
      </button>

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

      {gecikenIsler.length > 0 && gecikenKart}

      {hedefKart}

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
            sonRaporlar.slice(0, 5).map((r) => <ReportCard key={r.id} rapor={r} />)
          )}
        </div>
      </div>
    </div>
  );
}
