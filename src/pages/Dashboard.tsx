import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIstatistikler, getAdaGenelIlerleme, getBlokProgress, getGrupAgirlikliAdaIlerleme, getProjeAgirlikliIlerleme } from '../stores/reportStore';
import { useHedefler } from '../hooks/useHedefler';
import { useRaporlar } from '../hooks/useRaporlar';
import { getHedefOzeti, hedefKalanGun } from '../data/plan';
import type { Rapor } from '../types';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { getAdaList, getAllKalemler } from '../config/helpers';
import { DURUM_RENKLERI } from '../config/defaultConfig';
import DonutChart from '../components/DonutChart';
import BarChart from '../components/BarChart';
import BlokMatrisi from '../components/BlokMatrisi';
import ProgressBar from '../components/ProgressBar';
import KpiCard from '../components/dashboard/KpiCard';
import GecikenKart from '../components/dashboard/GecikenKart';
import HedefKart from '../components/dashboard/HedefKart';
import YaklasanKart from '../components/dashboard/YaklasanKart';
import PersonelAktiviteKart from '../components/dashboard/PersonelAktiviteKart';
import KalemIlerlemeKart from '../components/dashboard/KalemIlerlemeKart';
import TrendKart from '../components/dashboard/TrendKart';
import AdaDetayTablo from '../components/dashboard/AdaDetayTablo';
import SonRaporlarKart from '../components/dashboard/SonRaporlarKart';
import HakedisKarsilastirmaKart from '../components/dashboard/HakedisKarsilastirmaKart';
import { card, btnGhost } from '../utils/styles';

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

  const sonRaporlarMap = useMemo(() => {
    const map = new Map<string, Rapor>();
    for (const r of raporlar) {
      const anahtar = `${r.ada}|${r.blok_no}|${r.is_kalemi}`;
      const mevcut = map.get(anahtar);
      if (!mevcut || new Date(r.olusturma_tarihi).getTime() > new Date(mevcut.olusturma_tarihi).getTime()) {
        map.set(anahtar, r);
      }
    }
    return map;
  }, [raporlar]);

  const hedefOzeti = useMemo(
    () => getHedefOzeti(hedefler, (a, b, ik) => sonRaporlarMap.get(`${a}|${b}|${ik}`) ?? null),
    [hedefler, sonRaporlarMap]
  );

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

  const adaProgress = useMemo(() => {
    void raporlar;
    return adalar.map((a) => ({
      name: a.ada,
      value: getAdaGenelIlerleme(a.ada, a.bloklar, isKalemleri),
      color: '#f59e0b',
    }));
  }, [raporlar, adalar, isKalemleri]);

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

  const blokVerisi = useMemo(() => {
    void raporlar;
    const kalemToplam = new Map<string, number>();
    const kalemSayac = new Map<string, number>();
    const adaBlokMap: Record<string, Record<number, number>> = {};
    let raporluHuc = 0;
    let toplamHuc = 0;
    const toplamBlok = adalar.reduce((s, a) => s + a.bloklar.length, 0);
    for (const a of adalar) {
      const blokMap: Record<number, number> = {};
      for (const b of a.bloklar) {
        const progress = getBlokProgress(a.ada, b.blok_no, isKalemleri);
        let sum = 0;
        for (const ik of isKalemleri) {
          const r = progress[ik];
          const val = r ? r.ilerleme_yuzde : 0;
          sum += val;
          if (r) {
            raporluHuc++;
            kalemSayac.set(ik, (kalemSayac.get(ik) ?? 0) + 1);
          }
          kalemToplam.set(ik, (kalemToplam.get(ik) ?? 0) + val);
        }
        toplamHuc += isKalemleri.length;
        blokMap[b.blok_no] = Math.round(sum / isKalemleri.length);
      }
      adaBlokMap[a.ada] = blokMap;
    }
    return {
      adaBlokMap,
      kapsam: toplamHuc > 0 ? Math.round((raporluHuc / toplamHuc) * 100) : 0,
      kalemIlerleme: isKalemleri
        .map((ik) => ({
          kalem: ik,
          ortalama: toplamBlok > 0 ? Math.round((kalemToplam.get(ik) ?? 0) / toplamBlok) : 0,
          raporluBlok: kalemSayac.get(ik) ?? 0,
        }))
        .sort((x, y) => x.ortalama - y.ortalama),
    };
  }, [raporlar, adalar, isKalemleri]);

  const hakedisVerisi = useMemo(() => {
    const hk = config.hakedis;
    if (!hk) return null;
    const satirlar = adalar.map((a) => ({
      ada: a.ada,
      uygulama: getGrupAgirlikliAdaIlerleme(a.ada, a.bloklar),
      resmi: hk.grupIlerleme?.[a.ada]
        ? Object.values(hk.grupIlerleme[a.ada]).reduce((s, g) => s + g.gerceklesen, 0)
        : null,
      pursantaj: hk.adalar[a.ada]?.genel ?? 0,
    }));
    return {
      satirlar,
      ozet: {
        uygulama: getProjeAgirlikliIlerleme(adalar.map((a) => ({ ada: a.ada, bloklar: a.bloklar }))),
        resmi: hk.ilerlemeIcmal.toplam?.kum ?? null,
      },
      hakedisNo: hk.hakedisNo,
    };
  }, [adalar, config]);

  const trendData = useMemo(() => {
    const sayilar = new Map<string, number>();
    for (const r of raporlar) {
      sayilar.set(r.tarih, (sayilar.get(r.tarih) ?? 0) + 1);
    }
    const formatter = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit' });
    const gunler: { label: string; value: number }[] = [];
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(bugun.getTime() - i * 24 * 60 * 60 * 1000);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      gunler.push({ label: formatter.format(d), value: sayilar.get(iso) ?? 0 });
    }
    return gunler;
  }, [raporlar]);

  const yaklasanHedefler = useMemo(
    () =>
      hedefler
        .map((h) => {
          const rapor = sonRaporlarMap.get(`${h.ada}|${h.blok_no}|${h.is_kalemi}`) ?? null;
          return { ...h, kalanGun: hedefKalanGun(h.hedef_tarih), rapor };
        })
        .filter((h) => h.kalanGun >= 0 && h.kalanGun <= 14 && h.rapor?.durum !== 'tamamlandi')
        .sort((a, b) => a.kalanGun - b.kalanGun)
        .slice(0, 8),
    [hedefler, sonRaporlarMap]
  );

  const personelAktivite7 = useMemo(() => {
    const sinir = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const sayilar = new Map<string, number>();
    for (const r of raporlar) {
      if (new Date(r.olusturma_tarihi).getTime() < sinir) continue;
      sayilar.set(r.raporlayan, (sayilar.get(r.raporlayan) ?? 0) + 1);
    }
    return Array.from(sayilar.entries())
      .map(([ad_soyad, raporSayisi]) => ({ ad_soyad, raporSayisi }))
      .sort((a, b) => b.raporSayisi - a.raporSayisi)
      .slice(0, 8);
  }, [raporlar]);

  const blokNavigate = (ada: string, blokNo: number) =>
    navigate(blokNo === 0 ? `/ada/${ada}` : `/ada/${ada}/blok/${blokNo}`);

  const hedefKart = hedefOzeti.toplam > 0 && (
    <HedefKart
      ozet={hedefOzeti}
      onNavigate={blokNavigate}
      onHedefTakvim={() => navigate('/hedef-takvim')}
    />
  );

  const yaklasanKart = <YaklasanKart hedefler={yaklasanHedefler} onNavigate={blokNavigate} />;

  const personelAktiviteKart = personelAktivite7.length > 0 && (
    <PersonelAktiviteKart kisiler={personelAktivite7} />
  );

  const altKartlar = [hedefKart, yaklasanKart, personelAktiviteKart].filter(Boolean);

  if (isDesktop) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>
              {config.genel.santiyeAdi}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-faint)', margin: 0 }}>
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
          <KpiCard label="Rapor Kapsamı" value={`%${blokVerisi.kapsam}`} color="#6366f1" progress={blokVerisi.kapsam} />
          <KpiCard label="Toplam Rapor" value={stats.toplamRapor} color="#6b7280" />
          <KpiCard label="Tamamlandı" value={stats.tamamlananIsler} color="#22c55e" />
          <KpiCard label="Devam Ediyor" value={stats.devamEdenIsler} color="#3b82f6" />
          <KpiCard label="Planlandı" value={stats.planlananIsler} color="#f59e0b" />
          <KpiCard label="Gecikme" value={stats.gecikenIsler} color="#ef4444" />
        </div>

        {gecikenIsler.length > 0 && <GecikenKart isler={gecikenIsler} onNavigate={blokNavigate} />}

        {hakedisVerisi && (
          <div style={{ marginBottom: 16 }}>
            <HakedisKarsilastirmaKart
              satirlar={hakedisVerisi.satirlar}
              ozet={hakedisVerisi.ozet}
              hakedisNo={hakedisVerisi.hakedisNo}
            />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <TrendKart veri={trendData} />
          <div style={{ ...card }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', margin: 0, marginBottom: 8 }}>
              Rapor Dağılımı
            </h3>
            <DonutChart data={donutData} height={190} />
          </div>
          <div style={{ ...card }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', margin: 0, marginBottom: 8 }}>
              Ada Bazında İlerleme
            </h3>
            <BarChart data={adaProgress} height={190} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 16, marginBottom: 16, alignItems: 'start' }}>
          <KalemIlerlemeKart kalemler={blokVerisi.kalemIlerleme} toplamKalem={isKalemleri.length} />
          <div style={{ ...card }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', margin: 0, marginBottom: 8 }}>
              Ada × Blok Matrisi
            </h3>
            <BlokMatrisi
              adalar={adalar.map((a) => ({ ada: a.ada, bloklar: a.bloklar.map((b) => b.blok_no) }))}
              ilerleme={blokVerisi.adaBlokMap}
              onBlokClick={blokNavigate}
            />
          </div>
        </div>

        <AdaDetayTablo satirlar={adaDetay} onNavigate={(ada) => navigate(`/ada/${ada}`)} />

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${altKartlar.length}, minmax(0, 1fr))`, gap: 16, marginBottom: 16, alignItems: 'start' }}>
          {altKartlar.map((kart, i) => <div key={i}>{kart}</div>)}
        </div>

        <SonRaporlarKart raporlar={sonRaporlar} grid onTumu={() => navigate('/raporlar')} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>
          {config.genel.santiyeAdi}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-faint)', margin: 0 }}>
          {config.genel.projeAdi}
        </p>
      </div>

      <button
        onClick={() => navigate('/hedef-takvim')}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          width: '100%', background: 'var(--bg-card)', border: '1px solid #e5e7eb',
          borderRadius: 12, padding: '14px 16px', marginBottom: 16, cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>📅 Hedef Takvimi</span>
        <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>→</span>
      </button>

      <div style={{ ...card, padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>Genel İlerleme</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: genelIlerleme === 100 ? '#22c55e' : '#f59e0b' }}>
            %{genelIlerleme}
          </span>
        </div>
        <ProgressBar value={genelIlerleme} height={10} />
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>
            Rapor Dağılımı
          </h3>
          <button onClick={() => navigate('/istatistik')} style={btnGhost}>
            Detaylı İstatistik →
          </button>
        </div>
        <DonutChart data={donutData} />
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', margin: 0, marginBottom: 8 }}>
          Ada Bazında İlerleme
        </h3>
        <BarChart data={adaProgress} />
      </div>

      {gecikenIsler.length > 0 && <GecikenKart isler={gecikenIsler} onNavigate={blokNavigate} />}

      {hakedisVerisi && (
        <div style={{ marginBottom: 16 }}>
          <HakedisKarsilastirmaKart
            satirlar={hakedisVerisi.satirlar}
            ozet={hakedisVerisi.ozet}
            hakedisNo={hakedisVerisi.hakedisNo}
          />
        </div>
      )}

      {hedefKart}

      <div style={{ marginBottom: 16 }}>
        <SonRaporlarKart raporlar={sonRaporlar.slice(0, 5)} onTumu={() => navigate('/raporlar')} />
      </div>
    </div>
  );
}
