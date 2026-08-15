import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHedefler } from '../hooks/useHedefler';
import { useRaporlar } from '../hooks/useRaporlar';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { getAdaList } from '../config/helpers';
import { getIlerlemeDurumu, hedefKalanGun } from '../data/plan';
import type { Rapor } from '../types';
import { hedeflerXlsxExport } from '../utils/exportXlsx';
import { elementPdfExport } from '../utils/exportPdf';
import { toastGoster } from '../stores/toastStore';
import OzetChipSatiri from '../components/hedef-takvim/OzetChipSatiri';
import TakvimIzgarasi from '../components/hedef-takvim/TakvimIzgarasi';
import AyHedefleriKart from '../components/hedef-takvim/AyHedefleriKart';
import HedefTakvimPdf from '../components/hedef-takvim/HedefTakvimPdf';
import { AY_ADLARI, isoDate } from '../components/hedef-takvim/aylar';

export default function HedefTakvim() {
  const navigate = useNavigate();
  const config = useSiteConfig();
  const hedefler = useHedefler();
  const raporlar = useRaporlar();

  const bugun = new Date();
  const [gorunenAy, setGorunenAy] = useState(() => new Date(bugun.getFullYear(), bugun.getMonth(), 1));
  const [seciliAda, setSeciliAda] = useState<string>('');
  const pdfRef = useRef<HTMLDivElement>(null);

  const adalar = getAdaList(config);

  const gorunenHedefler = useMemo(() => {
    const sonRaporlarMap = new Map<string, Rapor>();
    for (const r of raporlar) {
      const anahtar = `${r.ada}|${r.blok_no}|${r.is_kalemi}`;
      const mevcut = sonRaporlarMap.get(anahtar);
      if (!mevcut || new Date(r.olusturma_tarihi).getTime() > new Date(mevcut.olusturma_tarihi).getTime()) {
        sonRaporlarMap.set(anahtar, r);
      }
    }
    return hedefler
      .filter((h) => !seciliAda || h.ada === seciliAda)
      .map((h) => {
        const rapor = sonRaporlarMap.get(`${h.ada}|${h.blok_no}|${h.is_kalemi}`) ?? null;
        return { ...h, rapor, durum: getIlerlemeDurumu(rapor, h.hedef_tarih) };
      });
  }, [hedefler, seciliAda, raporlar]);

  const tarihHedefleri = useMemo(() => {
    const harita = new Map<string, (typeof gorunenHedefler)[number][]>();
    for (const h of gorunenHedefler) {
      const liste = harita.get(h.hedef_tarih) ?? [];
      liste.push(h);
      harita.set(h.hedef_tarih, liste);
    }
    return harita;
  }, [gorunenHedefler]);

  const ayAnahtari = isoDate(gorunenAy).slice(0, 7);
  const ayHedefleri = useMemo(
    () => gorunenHedefler.filter((h) => h.hedef_tarih.startsWith(ayAnahtari)),
    [gorunenHedefler, ayAnahtari]
  );

  const ozet = useMemo(() => {
    const tamamlanan = gorunenHedefler.filter((h) => h.rapor?.durum === 'tamamlandi').length;
    const aktif = gorunenHedefler.filter((h) => h.rapor?.durum !== 'tamamlandi');
    const suresiGecen = aktif.filter((h) => hedefKalanGun(h.hedef_tarih) < 0).length;
    const bugunku = aktif.filter((h) => hedefKalanGun(h.hedef_tarih) === 0).length;
    const haftaUcunda = aktif.filter((h) => {
      const k = hedefKalanGun(h.hedef_tarih);
      return k > 0 && k <= 7;
    }).length;
    return { tamamlanan, suresiGecen, bugunku, haftaUcunda };
  }, [gorunenHedefler]);

  const hedefeGit = (ada: string, blokNo: number) => {
    navigate(blokNo === 0 ? `/ada/${ada}` : `/ada/${ada}/blok/${blokNo}`);
  };

  const ayOnce = () => setGorunenAy((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const aySonra = () => setGorunenAy((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const buguneGit = () => setGorunenAy(new Date(bugun.getFullYear(), bugun.getMonth(), 1));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>📅 Hedef Takvimi</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={buguneGit}
            style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            Bugün
          </button>
          <button
            onClick={async () => {
              await hedeflerXlsxExport(
                gorunenHedefler,
                (a, b, ik) => gorunenHedefler.find((h) => h.ada === a && h.blok_no === b && h.is_kalemi === ik)?.rapor ?? null,
                'hedef-takvimi.xlsx'
              );
              toastGoster(`${gorunenHedefler.length} hedef Excel olarak indiriliyor`, 'success');
            }}
            style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: 'var(--text-faint)', cursor: 'pointer' }}
            title="Excel Aktar"
          >
            📥
          </button>
          <button
            onClick={async () => {
              if (pdfRef.current) {
                await elementPdfExport(pdfRef.current, `hedef-takvimi_${AY_ADLARI[gorunenAy.getMonth()]}_${gorunenAy.getFullYear()}.pdf`);
                toastGoster('Hedef takvimi PDF olarak indiriliyor', 'success');
              }
            }}
            style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: 'var(--text-faint)', cursor: 'pointer' }}
            title="PDF Aktar"
          >
            📄
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button onClick={ayOnce} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)' }}>◀</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {AY_ADLARI[gorunenAy.getMonth()]} {gorunenAy.getFullYear()}
        </div>
        <button onClick={aySonra} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)' }}>▶</button>
      </div>

      {adalar.length > 1 && (
        <select
          value={seciliAda}
          onChange={(e) => setSeciliAda(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginBottom: 12, backgroundColor: 'var(--bg-card)' }}
        >
          <option value="">Tüm Adalar</option>
          {adalar.map((a) => (
            <option key={a.ada} value={a.ada}>{a.ada}</option>
          ))}
        </select>
      )}

      <OzetChipSatiri
        suresiGecen={ozet.suresiGecen}
        bugunku={ozet.bugunku}
        haftaUcunda={ozet.haftaUcunda}
        tamamlanan={ozet.tamamlanan}
      />

      <TakvimIzgarasi
        gorunenAy={gorunenAy}
        tarihHedefleri={tarihHedefleri}
        seciliAda={seciliAda}
        onHedefTikla={hedefeGit}
      />

      <AyHedefleriKart
        ayAdi={AY_ADLARI[gorunenAy.getMonth()]}
        ayHedefleri={ayHedefleri}
        onHedefTikla={hedefeGit}
      />

      <div
        ref={pdfRef}
        style={{
          position: 'absolute',
          left: -10000,
          top: 0,
          width: 820,
          backgroundColor: '#ffffff',
          padding: 24,
          color: '#111827',
          fontFamily: 'Helvetica, Arial, sans-serif',
        }}
      >
        <HedefTakvimPdf
          santiyeAdi={config.genel.santiyeAdi}
          ayAdi={AY_ADLARI[gorunenAy.getMonth()]}
          yil={gorunenAy.getFullYear()}
          seciliAda={seciliAda}
          ayHedefleri={ayHedefleri}
        />
      </div>
    </div>
  );
}
