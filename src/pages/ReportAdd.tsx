import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { getAda, getAdaList } from '../config/helpers';
import { DURUM_LABELLARI, DURUM_RENKLERI } from '../config/defaultConfig';
import { saveRapor, saveRaporlar, updateRapor, getRaporById, getBlokProgress } from '../stores/reportStore';
import { useRaporlar } from '../hooks/useRaporlar';
import { getCurrentUser } from '../stores/authStore';
import { getKullaniciAdaAtamasi, getKullaniciBloklari } from '../stores/atamaStore';
import { useIsDesktop } from '../hooks/useIsDesktop';
import type { IsDurumu } from '../types';
import { todayISO } from '../utils/helpers';
import { toastGoster } from '../stores/toastStore';
import { card } from '../utils/styles';

interface BlokBilgi {
  durum: IsDurumu;
  ilerleme_yuzde: number;
  adaGenel: boolean;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', marginBottom: 10 }}>{children}</div>
  );
}

function filtreliGruplar(config: ReturnType<typeof useSiteConfig>, arama: string) {
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

  // Ayni ada + is kalemi icin en son raporun durum/ilerleme/aciklama'sini,
  // kullanici henuz dokunmadiysa otomatik doldur.
  useEffect(() => {
    if (!ada || !isKalemi || editMode) return;
    const son = raporlar
      .filter((r) => r.ada === ada && r.is_kalemi === isKalemi)
      .sort(
        (a, b) =>
          new Date(b.olusturma_tarihi).getTime() - new Date(a.olusturma_tarihi).getTime()
      )[0];
    if (!son) return;
    if (durum === 'devam_ediyor' && ilerleme === 50 && aciklama === '') {
      setDurum(son.durum);
      setIlerleme(son.ilerleme_yuzde);
      setAciklama(son.aciklama);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const map: Record<number, BlokBilgi> = {};
    for (const b of adaData?.bloklar ?? []) {
      const sonRapor = getBlokProgress(ada, b.blok_no, [isKalemi])[isKalemi];
      if (!sonRapor) continue;
      const blokOzelVar = adaKalemRaporlari.some((r) => r.blok_no === b.blok_no);
      map[b.blok_no] = {
        durum: sonRapor.durum,
        ilerleme_yuzde: sonRapor.ilerleme_yuzde,
        adaGenel: !blokOzelVar,
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

  const adaSecimi = (
    <div>
      <SectionTitle>Ada</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {gosterilecekAdalar.map((a) => (
          <button
            key={a.ada}
            onClick={() => selectAda(a.ada)}
            style={{
              padding: '12px 14px',
              backgroundColor: ada === a.ada ? '#f59e0b' : '#f9fafb',
              border: '1px solid',
              borderColor: ada === a.ada ? '#f59e0b' : '#e5e7eb',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: ada === a.ada ? '#fff' : '#374151',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {a.ada}
            <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>
              {a.blok_sayisi} blok
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const isKalemiSecimi = (
    <div>
      <SectionTitle>İş Kalemi</SectionTitle>
      <input
        type="text"
        placeholder="İş kalemi ara..."
        value={kalemArama}
        onChange={(e) => setKalemArama(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 10,
          border: '1px solid #e5e7eb',
          fontSize: 13,
          boxSizing: 'border-box',
          marginBottom: 8,
        }}
      />
      {gruplar.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: 13,
            border: '1px dashed #e5e7eb',
            borderRadius: 10,
          }}
        >
          Eşleşen iş kalemi bulunamadı
        </div>
      ) : (
        <div
          style={{
            maxHeight: 340,
            overflowY: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
          }}
        >
          {gruplar.map((g) => (
            <div key={g.id}>
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  backgroundColor: '#f9fafb',
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#6b7280',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                {g.ad} ({g.kalemler.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 8 }}>
                {g.kalemler.map((ik) => (
                  <button
                    key={ik}
                    onClick={() => setIsKalemi(ik)}
                    style={{
                      padding: '10px 8px',
                      backgroundColor: isKalemi === ik ? '#f59e0b' : '#f9fafb',
                      border: '1px solid',
                      borderColor: isKalemi === ik ? '#f59e0b' : '#e5e7eb',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 500,
                      color: isKalemi === ik ? '#fff' : '#374151',
                      cursor: 'pointer',
                    }}
                  >
                    {ik}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!editMode && sonOneri && (
        <div
          style={{
            fontSize: 11,
            color: '#9ca3af',
            marginTop: 8,
            padding: '6px 10px',
            backgroundColor: '#f9fafb',
            borderRadius: 8,
          }}
        >
          Bu ada + iş kalemi için son rapor: {DURUM_LABELLARI[sonOneri.durum]} (
          %{sonOneri.ilerleme_yuzde}) — değerler otomatik dolduruldu, değiştirebilirsiniz.
        </div>
      )}
    </div>
  );

  const blokSecimi = editMode ? null : (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <SectionTitle>Bloklar</SectionTitle>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={toggleAdaGeneli}
            style={{
              background: adaGeneli ? '#fef3c7' : 'none',
              border: adaGeneli ? '1px solid #f59e0b' : '1px solid #e5e7eb',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 11,
              color: adaGeneli ? '#92400e' : '#6b7280',
              cursor: 'pointer',
            }}
            title="Raporu ada geneli (tüm bloklar) olarak kaydet"
          >
            {adaGeneli ? '✓ ' : ''}Ada Geneli
          </button>
          {!adaGeneli && (
            <>
              <button onClick={tumunuSec} style={kucukButon}>Tümünü Seç</button>
              <button onClick={temizle} style={kucukButon}>Temizle</button>
            </>
          )}
        </div>
      </div>

      {adaGeneli ? (
        <div style={{ padding: 14, backgroundColor: '#fef3c7', borderRadius: 10, fontSize: 12, color: '#92400e' }}>
          Bu iş kalemi için tek bir <strong>ada geneli rapor</strong> kaydedilecek. Tüm bloklar bu veriyi devralır.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
            {yetkiliBloklar.length === 0
              ? 'Bu ada için yetkiniz bulunan blok yok.'
              : `${seciliBloklar.length}/${yetkiliBloklar.length} blok seçili. Renkli bloklar mevcut raporu gösterir.`}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))', gap: 6 }}>
            {adaData?.bloklar
              .filter((b) => yetkiliBloklar.includes(b.blok_no))
              .map((b) => {
                const bilgi = blokDurumMap[b.blok_no];
                const isSelected = seciliBloklar.includes(b.blok_no);
                let bgColor = '#f3f4f6';
                let textColor = '#4b5563';
                if (bilgi) {
                  bgColor = DURUM_RENKLERI[bilgi.durum];
                  textColor = '#fff';
                } else if (isSelected) {
                  bgColor = '#f59e0b';
                  textColor = '#fff';
                }
                const tooltip = bilgi
                  ? `${DURUM_LABELLARI[bilgi.durum]} (%${bilgi.ilerleme_yuzde})${bilgi.adaGenel ? ' — Ada Geneli' : ''}`
                  : 'Henüz rapor girilmemiş';
                return (
                  <button
                    key={b.blok_no}
                    onClick={() => toggleBlok(b.blok_no)}
                    title={tooltip}
                    style={{
                      padding: 8,
                      backgroundColor: bgColor,
                      border: bilgi?.adaGenel
                        ? '2px dashed #fff'
                        : isSelected
                          ? '2px solid #fff'
                          : 'none',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      color: textColor,
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 0 0 2px #f59e0b' : 'none',
                    }}
                  >
                    {b.blok_no}
                  </button>
                );
              })}
          </div>
        </>
      )}
    </div>
  );

  const durumSecimi = (
    <div>
      <SectionTitle>Durum</SectionTitle>
      <div style={{ display: 'flex', gap: 8 }}>
        {(Object.entries(DURUM_LABELLARI) as [IsDurumu, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setDurum(key)}
            style={{
              flex: 1,
              padding: '10px 8px',
              backgroundColor: durum === key ? '#f59e0b' : '#f3f4f6',
              border: 'none',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              color: durum === key ? '#fff' : '#4b5563',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  const ilerlemeSecimi = durum !== 'tamamlandi' && durum !== 'planlandi' && (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#4b5563' }}>İlerleme: %{ilerleme}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 25, 50, 75, 100].map((p) => (
            <button
              key={p}
              onClick={() => setIlerleme(p)}
              style={{
                padding: '2px 8px',
                backgroundColor: ilerleme === p ? '#fef3c7' : '#f9fafb',
                border: ilerleme === p ? '1px solid #f59e0b' : '1px solid #e5e7eb',
                borderRadius: 6,
                fontSize: 11,
                color: ilerleme === p ? '#92400e' : '#6b7280',
                cursor: 'pointer',
              }}
            >
              %{p}
            </button>
          ))}
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={ilerleme}
        onChange={(e) => setIlerleme(parseInt(e.target.value))}
        style={{ width: '100%' }}
      />
    </div>
  );

  const detaySecimi = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#4b5563', marginBottom: 6 }}>
          Açıklama
        </label>
        <textarea
          value={aciklama}
          onChange={(e) => setAciklama(e.target.value)}
          placeholder="İşin durumu hakkında notlar..."
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            fontSize: 13,
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#4b5563', marginBottom: 6 }}>
            Tarih
          </label>
          <input
            type="date"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#4b5563', marginBottom: 6 }}>
            Raporlayan
          </label>
          <input
            type="text"
            value={kullaniciAdi}
            readOnly
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              fontSize: 13,
              backgroundColor: '#f9fafb',
              color: '#374151',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
    </div>
  );

  const aksiyonlar = (
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
  );

  const sola = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {adaSecimi}
      {isKalemiSecimi}
    </div>
  );

  const saga = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {blokSecimi}
      {durumSecimi}
      {ilerlemeSecimi}
      {detaySecimi}
      {aksiyonlar}
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

const kucukButon = {
  background: 'none',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  padding: '2px 8px',
  fontSize: 11,
  color: '#6b7280',
  cursor: 'pointer',
} as const;
