import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIstatistikler, getAdaGenelIlerleme, getBlokProgress } from '../stores/reportStore';
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
import ReportCard from '../components/ReportCard';
import ProgressBar from '../components/ProgressBar';
import TrendChart from '../components/TrendChart';
import BlokMatrisi from '../components/BlokMatrisi';
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

  const blokVerisi = useMemo(() => {
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
  }, [adalar, isKalemleri]);

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

  const personelAktiviteKart = personelAktivite7.length > 0 && (
    <div style={{ ...card, marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 12 }}>
        Son 7 Gün Personel Aktivitesi
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {personelAktivite7.map((p, i) => (
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
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>{p.raporSayisi} rapor</div>
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

  const trendKart = (
    <div style={{ ...card }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 8 }}>
        Zaman Trendi
      </h3>
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Son 14 gün rapor hacmi</div>
      <TrendChart data={trendData} />
    </div>
  );

  const kalemIlerlemeKart = (
    <div style={{ ...card }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 4 }}>
        İş Kalemi Bazında İlerleme
      </h3>
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>
        {isKalemleri.length} iş kalemi • proje geneli ortalama, en düşükten yükseğe
      </div>
      <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
        {blokVerisi.kalemIlerleme.map((k) => (
          <div key={k.kalem} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              title={`${k.kalem} — %${k.ortalama} (${k.raporluBlok} blokta rapor)`}
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 12,
                color: '#374151',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {k.kalem}
            </span>
            <div style={{ width: 120, flexShrink: 0 }}>
              <ProgressBar value={k.ortalama} height={6} />
            </div>
            <span style={{ width: 42, flexShrink: 0, textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#4b5563' }}>
              %{k.ortalama}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const yaklasanKart = (
    <div style={{ ...card, marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 10 }}>
        ⏰ Yaklaşan Hedefler
      </h3>
      {yaklasanHedefler.length === 0 ? (
        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Sonraki 14 gün içinde hedef yok. 🎉</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {yaklasanHedefler.map((h) => (
            <div
              key={`${h.ada}-${h.blok_no}-${h.is_kalemi}`}
              onClick={() => navigate(h.blok_no === 0 ? `/ada/${h.ada}` : `/ada/${h.ada}/blok/${h.blok_no}`)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 10px', backgroundColor: '#f9fafb', borderRadius: 8, cursor: 'pointer',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {h.ada} - {h.blok_no === 0 ? 'Ada Geneli' : `Blok ${h.blok_no}`}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {h.is_kalemi} • {h.hedef_tarih}
                </div>
              </div>
              <span
                style={{
                  flexShrink: 0,
                  marginLeft: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 10,
                  backgroundColor: h.kalanGun === 0 ? '#fef2f2' : h.kalanGun <= 7 ? '#fef3c7' : '#dbeafe',
                  color: h.kalanGun === 0 ? '#ef4444' : h.kalanGun <= 7 ? '#92400e' : '#1d4ed8',
                }}
              >
                {h.kalanGun === 0 ? 'Bugün' : `${h.kalanGun} gün`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const altKartlar = [hedefKart, yaklasanKart, personelAktiviteKart].filter(Boolean);

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
          <KpiCard label="Rapor Kapsamı" value={`%${blokVerisi.kapsam}`} color="#6366f1" progress={blokVerisi.kapsam} />
          <KpiCard label="Toplam Rapor" value={stats.toplamRapor} color="#6b7280" />
          <KpiCard label="Tamamlandı" value={stats.tamamlananIsler} color="#22c55e" />
          <KpiCard label="Devam Ediyor" value={stats.devamEdenIsler} color="#3b82f6" />
          <KpiCard label="Planlandı" value={stats.planlananIsler} color="#f59e0b" />
          <KpiCard label="Gecikme" value={stats.gecikenIsler} color="#ef4444" />
        </div>

        {gecikenIsler.length > 0 && gecikenKart}

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          {trendKart}
          <div style={{ ...card }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 8 }}>
              Rapor Dağılımı
            </h3>
            <DonutChart data={donutData} height={190} />
          </div>
          <div style={{ ...card }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 8 }}>
              Ada Bazında İlerleme
            </h3>
            <BarChart data={adaProgress} height={190} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 16, marginBottom: 16, alignItems: 'start' }}>
          {kalemIlerlemeKart}
          <div style={{ ...card }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 8 }}>
              Ada × Blok Matrisi
            </h3>
            <BlokMatrisi
              adalar={adalar.map((a) => ({ ada: a.ada, bloklar: a.bloklar.map((b) => b.blok_no) }))}
              ilerleme={blokVerisi.adaBlokMap}
              onBlokClick={(ada, blokNo) => navigate(`/ada/${ada}/blok/${blokNo}`)}
            />
          </div>
        </div>

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

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${altKartlar.length}, minmax(0, 1fr))`, gap: 16, marginBottom: 16, alignItems: 'start' }}>
          {altKartlar.map((kart, i) => <div key={i}>{kart}</div>)}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
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
