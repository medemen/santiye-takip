import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { getAda, getAdaList } from '../config/helpers';
import { saveRapor, saveRaporlar, updateRapor, getRaporById } from '../stores/reportStore';
import { useRaporlar } from '../hooks/useRaporlar';
import { getCurrentUser } from '../stores/authStore';
import { getKullaniciAdaAtamasi, getKullaniciBloklari } from '../stores/atamaStore';
import { useIsDesktop } from '../hooks/useIsDesktop';
import type { IsDurumu, Rapor } from '../types';
import { todayISO } from '../utils/helpers';
import { toastGoster } from '../stores/toastStore';
import { card } from '../utils/styles';
import AdaSecimi from '../components/report/AdaSecimi';
import IsKalemiSecimi from '../components/report/IsKalemiSecimi';
import BlokSecimi, { type BlokBilgi } from '../components/report/BlokSecimi';
import DurumSecimi from '../components/report/DurumSecimi';
import IlerlemeSecimi from '../components/report/IlerlemeSecimi';
import DetaySecimi from '../components/report/DetaySecimi';
import type { ImalatGrubu } from '../config/types';

function filtreliGruplar(config: ReturnType<typeof useSiteConfig>, arama: string): ImalatGrubu[] {
  const q = arama.trim().toLowerCase();
  return config.isKalemleri.gruplar
    .map((g) => ({
      ...g,
      kalemler: q ? g.kalemler.filter((ik) => ik.toLowerCase().includes(q)) : g.kalemler,
    }))
    .filter((g) => g.kalemler.length > 0);
}

export default function ReportAdd() {
  const navigate = useNavigate();
  const config = useSiteConfig();
  const isDesktop = useIsDesktop();
  const [searchParams] = useSearchParams();
  const preAda = searchParams.get('ada') || '';
  const preBlok = searchParams.get('blok') || '';
  const editId = searchParams.get('edit') || '';

  const user = getCurrentUser();
  const kullaniciAdi = user?.ad_soyad ?? '';
  const editMode = !!editId;
  const raporlar = useRaporlar();

  const atananAda = getKullaniciAdaAtamasi(kullaniciAdi);
  const userBloklar = atananAda ? getKullaniciBloklari(kullaniciAdi, atananAda) : [];
  const isAdmin = (user?.admin ?? false) || (user?.proje_muduru ?? false);

  const yetkiliAdalar = useMemo(() => {
    const arr: string[] = [];
    if (isAdmin) arr.push(...(user?.yetkili_adalar ?? []));
    else if (atananAda) arr.push(atananAda);
    return arr;
  }, [isAdmin, user?.yetkili_adalar, atananAda]);

  const gosterilecekAdalar = useMemo(
    () =>
      isAdmin
        ? getAdaList(config).filter((a) => yetkiliAdalar.includes(a.ada))
        : atananAda
          ? getAdaList(config).filter((a) => a.ada === atananAda)
          : [],
    [config, isAdmin, atananAda, yetkiliAdalar]
  );

  const [ada, setAda] = useState(
    preAda || (gosterilecekAdalar.length === 1 ? gosterilecekAdalar[0].ada : '')
  );
  const [blokNo, setBlokNo] = useState(preBlok ? parseInt(preBlok) : 0);
  const [seciliBloklar, setSeciliBloklar] = useState<number[]>(
    preBlok && parseInt(preBlok) > 0 ? [parseInt(preBlok)] : []
  );
  const [adaGeneli, setAdaGeneli] = useState(false);
  const [isKalemi, setIsKalemi] = useState('');
  const [kalemArama, setKalemArama] = useState('');
  const [durum, setDurum] = useState<IsDurumu>('devam_ediyor');
  const [ilerleme, setIlerleme] = useState(50);
  const [aciklama, setAciklama] = useState('');
  const [tarih, setTarih] = useState(todayISO());

  useEffect(() => {
    if (editId) {
      const rapor = getRaporById(editId);
      if (rapor) {
        setAda(rapor.ada);
        setBlokNo(rapor.blok_no);
        setIsKalemi(rapor.is_kalemi);
        setDurum(rapor.durum);
        setIlerleme(rapor.ilerleme_yuzde);
        setAciklama(rapor.aciklama);
        setTarih(rapor.tarih);
      }
    }
  }, [editId]);

  // Son raporu otomatik doldur: her yeni (ada, iş kalemi) kombinasyonu için.
  // Kopyalama akışı ref'i önceden güncellediği için otomatik doldurmayı atlar.
  const sonKombinasyon = useRef('');
  useEffect(() => {
    if (editMode || !ada || !isKalemi) return;
    const combo = `${ada}|${isKalemi}`;
    const yeni = combo !== sonKombinasyon.current;
    sonKombinasyon.current = combo;
    if (yeni) {
      setDurum('devam_ediyor');
      setIlerleme(50);
      setAciklama('');
    }
    const son = raporlar
      .filter((r) => r.ada === ada && r.is_kalemi === isKalemi)
      .sort(
        (a, b) =>
          new Date(b.olusturma_tarihi).getTime() - new Date(a.olusturma_tarihi).getTime()
      )[0];
    if (!son || !yeni) return;
    setDurum(son.durum);
    setIlerleme(son.ilerleme_yuzde);
    setAciklama(son.aciklama);
  }, [ada, isKalemi, editMode, raporlar]);

  const sonRapor = useMemo(() => {
    if (editMode) return null;
    const adaylar = raporlar.filter(
      (r) => r.raporlayan === kullaniciAdi && gosterilecekAdalar.some((a) => a.ada === r.ada)
    );
    if (adaylar.length === 0) return null;
    return adaylar
      .slice()
      .sort(
        (a, b) =>
          new Date(b.olusturma_tarihi).getTime() - new Date(a.olusturma_tarihi).getTime()
      )[0];
  }, [raporlar, kullaniciAdi, gosterilecekAdalar, editMode]);

  const sonOneri = useMemo(() => {
    if (!ada || !isKalemi) return null;
    return (
      raporlar
        .filter((r) => r.ada === ada && r.is_kalemi === isKalemi)
        .sort(
          (a, b) =>
            new Date(b.olusturma_tarihi).getTime() - new Date(a.olusturma_tarihi).getTime()
        )[0] ?? null
    );
  }, [ada, isKalemi, raporlar]);

  const sonRaporuKopyala = () => {
    if (!sonRapor) return;
    const r = sonRapor;
    sonKombinasyon.current = `${r.ada}|${r.is_kalemi}`;
    setAda(r.ada);
    if (r.blok_no > 0) {
      setSeciliBloklar([r.blok_no]);
      setBlokNo(r.blok_no);
      setAdaGeneli(false);
    } else {
      setAdaGeneli(true);
      setSeciliBloklar([]);
      setBlokNo(0);
    }
    setIsKalemi(r.is_kalemi);
    setDurum(r.durum);
    setIlerleme(r.ilerleme_yuzde);
    setAciklama(r.aciklama);
    setTarih(todayISO());
  };

  const adaData = ada ? getAda(config, ada) : null;

  const getBlokFiltre = () => {
    if (!ada) return [];
    if (isAdmin) {
      const blokAtama = getKullaniciBloklari(kullaniciAdi, ada);
      return blokAtama.length > 0 ? blokAtama : adaData?.bloklar.map((b) => b.blok_no) ?? [];
    }
    if (atananAda === ada) {
      return userBloklar.length > 0 ? userBloklar : adaData?.bloklar.map((b) => b.blok_no) ?? [];
    }
    return [];
  };

  const yetkiliBloklar = adaData
    ? adaData.bloklar.filter((b) => getBlokFiltre().includes(b.blok_no)).map((b) => b.blok_no)
    : [];

  const blokDurumMap = useMemo<Record<number, BlokBilgi>>(() => {
    if (!ada || !isKalemi) return {};
    const adaKalemRaporlari = raporlar.filter((r) => r.ada === ada && r.is_kalemi === isKalemi);
    const sonByBlok = new Map<number, Rapor>();
    for (const r of adaKalemRaporlari) {
      const mevcut = sonByBlok.get(r.blok_no);
      if (!mevcut || new Date(r.olusturma_tarihi).getTime() > new Date(mevcut.olusturma_tarihi).getTime()) {
        sonByBlok.set(r.blok_no, r);
      }
    }
    const map: Record<number, BlokBilgi> = {};
    for (const b of adaData?.bloklar ?? []) {
      const blokOzel = sonByBlok.get(b.blok_no);
      const sonRapor = blokOzel ?? sonByBlok.get(0);
      if (!sonRapor) continue;
      map[b.blok_no] = {
        durum: sonRapor.durum,
        ilerleme_yuzde: sonRapor.ilerleme_yuzde,
        adaGenel: !adaKalemRaporlari.some((r) => r.blok_no === b.blok_no),
      };
    }
    return map;
  }, [ada, isKalemi, adaData, raporlar]);

  const gruplar = filtreliGruplar(config, kalemArama);

  const selectAda = (a: string) => {
    setAda(a);
    setSeciliBloklar([]);
    setAdaGeneli(false);
  };

  const toggleBlok = (b: number) => {
    setSeciliBloklar((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    );
  };

  const tumunuSec = () => setSeciliBloklar(yetkiliBloklar);
  const temizle = () => setSeciliBloklar([]);

  const toggleAdaGeneli = () => {
    setAdaGeneli((v) => {
      const yeni = !v;
      if (yeni) setSeciliBloklar([]);
      return yeni;
    });
  };

  const kaydetRapor = (): string | null => {
    if (!ada || !isKalemi || !user) return null;
    const veri = {
      tarih,
      raporlayan: kullaniciAdi,
      ada,
      is_kalemi: isKalemi,
      durum,
      ilerleme_yuzde: durum === 'tamamlandi' ? 100 : ilerleme,
      aciklama,
    };
    if (editMode && editId) {
      updateRapor(editId, { ...veri, blok_no: blokNo });
      toastGoster('Rapor güncellendi', 'success');
      return editId;
    }
    if (adaGeneli) {
      const yeni = saveRapor({ ...veri, blok_no: 0 });
      toastGoster('Ada geneli rapor kaydedildi', 'success');
      return yeni.id;
    }
    if (seciliBloklar.length === 1) {
      const yeni = saveRapor({ ...veri, blok_no: seciliBloklar[0] });
      toastGoster('Rapor kaydedildi', 'success');
      return yeni.id;
    }
    const yeniler = saveRaporlar(seciliBloklar.map((b) => ({ ...veri, blok_no: b })));
    toastGoster(`${seciliBloklar.length} blok için rapor kaydedildi`, 'success');
    return yeniler[0]?.id ?? null;
  };

  const handleSubmit = () => {
    const id = kaydetRapor();
    if (!id) return;
    navigate('/raporlar');
  };

  const handleKaydetVeYeni = () => {
    const id = kaydetRapor();
    if (!id) return;
    sonKombinasyon.current = '';
    setIsKalemi('');
    setKalemArama('');
    setSeciliBloklar([]);
    setAdaGeneli(false);
    setDurum('devam_ediyor');
    setIlerleme(50);
    setAciklama('');
    setTarih(todayISO());
  };

  if (gosterilecekAdalar.length === 0) {
    return (
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>
          Rapor Ekle
        </h1>
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 40,
            textAlign: 'center',
            border: '1px solid #f0f0f0',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            Size atanmış bir ada bulunmuyor.
            {isAdmin ? ' Personel sayfasından atama yapabilirsiniz.' : ''}
          </p>
        </div>
      </div>
    );
  }

  const canSave = ada && isKalemi && (adaGeneli || seciliBloklar.length > 0);
  const kaydetEtiketi = !isKalemi
    ? 'İş Kalemi Seçin'
    : adaGeneli
      ? 'Ada Geneli Rapor Kaydet'
      : seciliBloklar.length > 0
        ? `${seciliBloklar.length} Blok İçin Rapor Kaydet`
        : 'Blok Seçin';

  const sola = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <AdaSecimi adalar={gosterilecekAdalar} secili={ada} onSelect={selectAda} />
      <IsKalemiSecimi
        gruplar={gruplar}
        secili={isKalemi}
        arama={kalemArama}
        onAramaDegis={setKalemArama}
        onSelect={setIsKalemi}
        oneri={editMode || !sonOneri ? null : { durum: sonOneri.durum, ilerleme: sonOneri.ilerleme_yuzde }}
      />
    </div>
  );

  const saga = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!editMode && (
        <BlokSecimi
          bloklar={yetkiliBloklar}
          yetkiliBloklar={yetkiliBloklar}
          seciliBloklar={seciliBloklar}
          blokDurumMap={blokDurumMap}
          adaGeneli={adaGeneli}
          onToggleAdaGeneli={toggleAdaGeneli}
          onToggleBlok={toggleBlok}
          onTumunuSec={tumunuSec}
          onTemizle={temizle}
        />
      )}
      <DurumSecimi durum={durum} onChange={setDurum} />
      {durum !== 'tamamlandi' && durum !== 'planlandi' && (
        <IlerlemeSecimi ilerleme={ilerleme} onChange={setIlerleme} />
      )}
      <DetaySecimi
        aciklama={aciklama}
        onAciklamaDegis={setAciklama}
        tarih={tarih}
        onTarihDegis={setTarih}
        raporlayan={kullaniciAdi}
      />
      <div style={{ display: 'flex', gap: 10 }}>
        {editMode && (
          <button
            onClick={() => navigate('/raporlar')}
            style={{
              flex: 1,
              padding: 12,
              backgroundColor: '#f3f4f6',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              color: '#4b5563',
              cursor: 'pointer',
            }}
          >
            Vazgeç
          </button>
        )}
        {!editMode && (
          <button
            onClick={handleKaydetVeYeni}
            disabled={!canSave}
            style={{
              flex: 1,
              padding: 12,
              backgroundColor: canSave ? '#dbeafe' : '#f3f4f6',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              color: canSave ? '#1e40af' : '#9ca3af',
              cursor: canSave ? 'pointer' : 'not-allowed',
            }}
          >
            Kaydet ve Yeni
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!canSave}
          style={{
            flex: 2,
            padding: 12,
            backgroundColor: canSave ? '#f59e0b' : '#e5e7eb',
            border: 'none',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            color: canSave ? '#fff' : '#9ca3af',
            cursor: canSave ? 'pointer' : 'not-allowed',
          }}
        >
          {editMode ? 'Güncelle' : kaydetEtiketi}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>
        {editMode ? 'Rapor Düzenle' : 'Rapor Ekle'}
      </h1>
      <p style={{ fontSize: 13, color: '#6b7280', margin: 0, marginBottom: 16 }}>
        {editMode
          ? 'Mevcut raporu güncelleyin'
          : 'Bir veya birden çok blok için iş kalemi ilerlemesini raporlayın'}
      </p>

      {!editMode && sonRapor && (
        <button
          onClick={sonRaporuKopyala}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#fff7ed',
            border: '1px solid #fdba74',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            color: '#c2410c',
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          📋 Son raporu kopyala ({sonRapor.ada}
          {sonRapor.blok_no > 0 ? ` · Blok ${sonRapor.blok_no}` : ' · Ada Geneli'} ·{' '}
          {sonRapor.is_kalemi})
        </button>
      )}

      {editMode && (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 16,
            border: '1px solid #f0f0f0',
            fontSize: 13,
            color: '#374151',
          }}
        >
          <strong>{ada}</strong> - {blokNo === 0 ? 'Ada Geneli' : `Blok ${blokNo}`} — {isKalemi}
        </div>
      )}

      <div style={{ ...card, padding: 20 }}>
        {isDesktop && !editMode ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>{sola}</div>
            <div>{saga}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {sola}
            {saga}
          </div>
        )}
      </div>
    </div>
  );
}
