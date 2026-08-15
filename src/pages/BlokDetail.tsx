import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import BlokBilgiKart from '../components/blok/BlokBilgiKart';
import AdaGeneliRaporUyari from '../components/blok/AdaGeneliRaporUyari';
import IsKalemleriDurumu from '../components/blok/IsKalemleriDurumu';
import BlokEylemler from '../components/blok/BlokEylemler';
import RaporGecmisi from '../components/blok/RaporGecmisi';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useHedefler } from '../hooks/useHedefler';
import { useRaporlar } from '../hooks/useRaporlar';
import { getBlok, getAllKalemler, getGrupByKalem } from '../config/helpers';
import { getBlokProgress } from '../stores/reportStore';
import { getSantiyeSefi } from '../stores/kullanicilarStore';
import { hedefDuzetmeYetkisiVarMi } from '../stores/hedefStore';

export default function BlokDetail() {
  const { ada, blokNo } = useParams<{ ada: string; blokNo: string }>();
  const navigate = useNavigate();
  const config = useSiteConfig();
  const blokNum = parseInt(blokNo || '0');
  const raporlar = useRaporlar();

  const blok = getBlok(config, ada!, blokNum);
  const isKalemleri = getAllKalemler(config);

  const progress = getBlokProgress(ada!, blokNum, isKalemleri);
  const genelIlerleme = (() => {
    const values = Object.values(progress);
    if (values.length === 0) return 0;
    const toplam = values.reduce((sum, r) => {
      if (!r) return sum;
      if (r.durum === 'tamamlandi') return sum + 100;
      return sum + r.ilerleme_yuzde;
    }, 0);
    return Math.round(toplam / values.length);
  })();
  const santiyeSefi = getSantiyeSefi(ada!);
  const blokRaporlar = useMemo(
    () => raporlar
      .filter((r) => r.ada === ada && r.blok_no === blokNum)
      .sort((a, b) => new Date(b.olusturma_tarihi).getTime() - new Date(a.olusturma_tarihi).getTime()),
    [raporlar, ada, blokNum]
  );
  const blokOzelRaporVar = blokRaporlar.length > 0;

  const hedefler = useHedefler();
  const hedefDuzenleyebilir = hedefDuzetmeYetkisiVarMi();

  const kalemIlerlemeleri = isKalemleri.map((ik) => {
    const r = progress[ik];
    return { isKalemi: ik, rapor: r, grup: getGrupByKalem(config, ik) };
  });

  const tamamlanan = kalemIlerlemeleri.filter((p) => p.rapor?.durum === 'tamamlandi').length;
  const geciken = kalemIlerlemeleri.filter((p) => p.rapor?.durum === 'gecikme').length;
  const devamEden = kalemIlerlemeleri.filter((p) => p.rapor?.durum === 'devam_ediyor').length;

  if (!blok) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-subtle)' }}>Blok bulunamadı</div>;
  }

  return (
    <div>
      <button
        onClick={() => navigate(`/ada/${ada}`)}
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
        ← {ada}'ya Dön
      </button>

      <BlokBilgiKart
        ada={ada!}
        blok={blok}
        santiyeSefi={santiyeSefi}
        tamamlanan={tamamlanan}
        devamEden={devamEden}
        geciken={geciken}
        genelIlerleme={genelIlerleme}
      />

      <AdaGeneliRaporUyari gorunur={!blokOzelRaporVar} />

      <IsKalemleriDurumu
        ada={ada!}
        blokNum={blokNum}
        gruplar={config.isKalemleri.gruplar}
        kalemIlerlemeleri={kalemIlerlemeleri}
        hedefler={hedefler}
        hedefDuzenleyebilir={hedefDuzenleyebilir}
      />

      <BlokEylemler
        onRaporEkle={() => navigate(`/rapor-ekle?ada=${ada}&blok=${blok.blok_no}`)}
        onRaporlariGor={() => navigate(`/raporlar?ada=${ada}&blok=${blok.blok_no}`)}
      />

      {blokRaporlar.length > 0 && <RaporGecmisi raporlar={blokRaporlar} />}
    </div>
  );
}
