import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { blokData } from '../data/blokData';
import { IS_KALEMLERI, IMALAT_GRUPLARI, DURUM_LABELLARI, DURUM_RENKLERI } from '../data/isKalemleri';
import { saveRapor, getRaporlar, getBlokProgress } from '../store/reportStore';
import { getCurrentUser } from '../store/authStore';
import { getKullaniciAdaAtamasi } from '../store/atamaStore';
import type { IsDurumu } from '../types';
import { todayISO } from '../utils/helpers';
import { toastGoster } from '../store/toastStore';

export default function BulkReport() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const kullaniciAdi = user?.ad_soyad ?? '';

  const atananAda = getKullaniciAdaAtamasi(kullaniciAdi);
  const yetkiliAdalar: string[] = [];
  if (user?.admin) {
    yetkiliAdalar.push(...user.yetkili_adalar);
  } else if (atananAda) {
    yetkiliAdalar.push(atananAda);
  }

  const gosterilecekAdalar = user?.admin
    ? blokData.adalar.filter((a) => yetkiliAdalar.includes(a.ada))
    : atananAda
      ? blokData.adalar.filter((a) => a.ada === atananAda)
      : [];

  const [ada, setAda] = useState('');
  const [seciliBloklar, setSeciliBloklar] = useState<number[]>([]);
  const [adaGeneli, setAdaGeneli] = useState(false);
  const [isKalemi, setIsKalemi] = useState('');
  const [durum, setDurum] = useState<IsDurumu>('devam_ediyor');
  const [ilerleme, setIlerleme] = useState(50);
  const [aciklama, setAciklama] = useState('');
  const [tarih, setTarih] = useState(todayISO());
  const [kalemArama, setKalemArama] = useState('');
  const [acikGruplar, setAcikGruplar] = useState<Set<string>>(new Set());

  const adaData = ada ? blokData.adalar.find((a) => a.ada === ada) : null;

  const blokDurumMap = useMemo(() => {
    if (!ada || !isKalemi) return {} as Record<number, { durum: IsDurumu; ilerleme_yuzde: number; adaGenel: boolean }>;
    const raporlar = getRaporlar().filter((r) => r.ada === ada && r.is_kalemi === isKalemi);
    const map: Record<number, { durum: IsDurumu; ilerleme_yuzde: number; adaGenel: boolean }> = {};
    for (const b of adaData?.bloklar ?? []) {
      const sonRapor = getBlokProgress(ada, b.blok_no, [isKalemi])[isKalemi];
      if (!sonRapor) continue;
      const blokOzelVar = raporlar.some((r) => r.blok_no === b.blok_no);
      map[b.blok_no] = {
        durum: sonRapor.durum,
        ilerleme_yuzde: sonRapor.ilerleme_yuzde,
        adaGenel: !blokOzelVar,
      };
    }
    return map;
  }, [ada, isKalemi, adaData]);

  const toggleBlok = (blokNo: number) => {
    setSeciliBloklar((prev) =>
      prev.includes(blokNo)
        ? prev.filter((b) => b !== blokNo)
        : [...prev, blokNo]
    );
  };

  const tumunuSec = () => {
    if (!adaData) return;
    setSeciliBloklar(adaData.bloklar.map((b) => b.blok_no));
  };

  const temizle = () => setSeciliBloklar([]);

  const toggleGrup = (grupId: string) => {
    setAcikGruplar((prev) => {
      const yeni = new Set(prev);
      if (yeni.has(grupId)) yeni.delete(grupId);
      else yeni.add(grupId);
      return yeni;
    });
  };

  const handleSubmit = () => {
    if (!ada || !isKalemi || !user) return;
    if (!adaGeneli && seciliBloklar.length === 0) return;
    if (adaGeneli) {
      saveRapor({
        tarih,
        raporlayan: kullaniciAdi,
        ada,
        blok_no: 0,
        is_kalemi: isKalemi,
        durum,
        ilerleme_yuzde: durum === 'tamamlandi' ? 100 : ilerleme,
        aciklama,
      });
      toastGoster('Ada geneli rapor kaydedildi', 'success');
    } else {
      for (const blokNo of seciliBloklar) {
        saveRapor({
          tarih,
          raporlayan: kullaniciAdi,
          ada,
          blok_no: blokNo,
          is_kalemi: isKalemi,
          durum,
          ilerleme_yuzde: durum === 'tamamlandi' ? 100 : ilerleme,
          aciklama,
        });
      }
      toastGoster(`${seciliBloklar.length} blok için rapor kaydedildi`, 'success');
    }
    navigate('/raporlar');
  };

  const mevcutRaporSayisi = ada && isKalemi
    ? Object.keys(blokDurumMap).length
    : 0;
  const toplamBlokSayisi = adaData?.bloklar.length ?? 0;

  const kalemButonlari = (kalemler: readonly string[]) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      {kalemler.map((ik) => (
        <button
          key={ik}
          onClick={() => { setIsKalemi(ik); setSeciliBloklar([]); }}
          style={{
            padding: '8px 6px',
            backgroundColor: isKalemi === ik ? '#f59e0b' : '#f9fafb',
            border: '1px solid', borderColor: isKalemi === ik ? '#f59e0b' : '#e5e7eb',
            borderRadius: 8, fontSize: 11, fontWeight: 500,
            color: isKalemi === ik ? '#fff' : '#374151', cursor: 'pointer',
          }}
        >
          {ik}
        </button>
      ))}
    </div>
  );

  if (gosterilecekAdalar.length === 0) {
    return (
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>Toplu Rapor</h1>
        <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', border: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Size atanmış bir ada bulunmuyor.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>Toplu Rapor</h1>
      <p style={{ fontSize: 13, color: '#6b7280', margin: 0, marginBottom: 16 }}>
        Tek seferde birden çok blok (veya ada geneli) için rapor oluşturun
      </p>

      <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, border: '1px solid #f0f0f0' }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#4b5563', marginBottom: 6 }}>İş Kalemi</label>
          <input
            type="text"
            placeholder="İş kalemi ara..."
            value={kalemArama}
            onChange={(e) => setKalemArama(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
              fontSize: 13, boxSizing: 'border-box', marginBottom: 8,
            }}
          />
          {kalemArama ? (
            <div style={{ marginBottom: 4 }}>
              {kalemButonlari(
                IS_KALEMLERI.filter((ik) =>
                  ik.toLowerCase().includes(kalemArama.toLowerCase())
                )
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
              {IMALAT_GRUPLARI.map((g) => {
                const acik = acikGruplar.has(g.id);
                return (
                  <div key={g.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                    <button
                      onClick={() => toggleGrup(g.id)}
                      style={{
                        width: '100%', padding: '8px 12px',
                        backgroundColor: acik ? '#fef3c7' : '#f9fafb',
                        border: 'none', fontSize: 12, fontWeight: 600, color: '#374151',
                        cursor: 'pointer', textAlign: 'left',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}
                    >
                      <span>
                        {g.ad}{' '}
                        <span style={{ fontWeight: 400, color: '#9ca3af' }}>({g.kalemler.length})</span>
                      </span>
                      <span style={{ fontSize: 11, color: '#f59e0b' }}>{acik ? '▾ Kapat' : '▸ Aç'}</span>
                    </button>
                    {acik && (
                      <div style={{ padding: 8, backgroundColor: '#fff' }}>
                        {kalemButonlari(g.kalemler)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#4b5563', marginBottom: 6 }}>Ada</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {gosterilecekAdalar.map((a) => (
              <button
                key={a.ada}
                onClick={() => { setAda(a.ada); setSeciliBloklar([]); }}
                style={{
                  padding: '12px 14px',
                  backgroundColor: ada === a.ada ? '#f59e0b' : '#f9fafb',
                  border: '1px solid', borderColor: ada === a.ada ? '#f59e0b' : '#e5e7eb',
                  borderRadius: 10, fontSize: 13, fontWeight: 600,
                  color: ada === a.ada ? '#fff' : '#374151', cursor: 'pointer',
                }}
              >
                {a.ada} ({a.blok_sayisi} blok)
              </button>
            ))}
          </div>
        </div>

        {ada && adaData && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#4b5563' }}>
                {adaGeneli ? 'Hedef: Ada Geneli' : `Bloklar (${seciliBloklar.length}/${adaData.bloklar.length} seçili)`}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setAdaGeneli((v) => { const yeni = !v; if (yeni) setSeciliBloklar([]); return yeni; })}
                  style={{
                    background: adaGeneli ? '#fef3c7' : 'none',
                    border: adaGeneli ? '1px solid #f59e0b' : '1px solid #e5e7eb',
                    borderRadius: 6, padding: '2px 8px', fontSize: 11,
                    color: adaGeneli ? '#92400e' : '#6b7280', cursor: 'pointer',
                  }}
                  title="Raporu ada geneli (blok_no=0) olarak kaydet"
                >
                  {adaGeneli ? '✓ ' : ''}Ada Geneli
                </button>
                {!adaGeneli && (
                  <>
                    <button onClick={tumunuSec} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#6b7280', cursor: 'pointer' }}>Tümünü Seç</button>
                    <button onClick={temizle} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#6b7280', cursor: 'pointer' }}>Temizle</button>
                  </>
                )}
              </div>
            </div>

            {adaGeneli ? (
              <div style={{ padding: 14, backgroundColor: '#fef3c7', borderRadius: 10, fontSize: 12, color: '#92400e' }}>
                Bu iş kalemi için tek bir <strong>ada geneli rapor</strong> kaydedilecek (blok_no=0). Tüm bloklar bu veriyi devralır.
              </div>
            ) : (
              <>
                {mevcutRaporSayisi > 0 && (
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px 0' }}>
                    Seçili imalat için {mevcutRaporSayisi}/{toplamBlokSayisi} blokta rapor var (renkli gösterim). Boş bloklar ada geneli veriyi devralır.
                  </p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))', gap: 6 }}>
                  {adaData.bloklar.map((b) => {
                    const durumBilgisi = blokDurumMap[b.blok_no];
                    const isSelected = seciliBloklar.includes(b.blok_no);
                    let bgColor: string;
                    let textColor: string;
                    if (durumBilgisi) {
                      bgColor = DURUM_RENKLERI[durumBilgisi.durum];
                      textColor = '#fff';
                    } else if (isSelected) {
                      bgColor = '#f59e0b';
                      textColor = '#fff';
                    } else {
                      bgColor = '#f3f4f6';
                      textColor = '#4b5563';
                    }
                    const durumLabel = durumBilgisi ? DURUM_LABELLARI[durumBilgisi.durum] : '';
                    const tooltip = durumBilgisi
                      ? `${durumLabel} (%${durumBilgisi.ilerleme_yuzde})${durumBilgisi.adaGenel ? ' — Ada Geneli' : ''}`
                      : 'Henüz rapor girilmemiş';
                    return (
                      <button
                        key={b.blok_no}
                        onClick={() => toggleBlok(b.blok_no)}
                        title={tooltip}
                        style={{
                          padding: 8,
                          backgroundColor: bgColor,
                          border: durumBilgisi?.adaGenel ? '2px dashed #fff' : isSelected ? '2px solid #fff' : 'none',
                          borderRadius: 8, fontSize: 12, fontWeight: 600,
                          color: textColor, cursor: 'pointer',
                          boxShadow: isSelected ? '0 0 0 2px #f59e0b' : 'none',
                        }}
                      >
                        {b.blok_no}{isSelected ? ' ✓' : ''}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#4b5563', marginBottom: 6 }}>Durum</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(Object.entries(DURUM_LABELLARI) as [IsDurumu, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setDurum(key)}
                style={{
                  flex: 1, padding: '10px 8px',
                  backgroundColor: durum === key ? '#f59e0b' : '#f3f4f6',
                  border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600,
                  color: durum === key ? '#fff' : '#4b5563', cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {durum !== 'tamamlandi' && durum !== 'planlandi' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#4b5563', marginBottom: 6 }}>İlerleme: %{ilerleme}</label>
            <input type="range" min={0} max={100} value={ilerleme} onChange={(e) => setIlerleme(parseInt(e.target.value))} style={{ width: '100%' }} />
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#4b5563', marginBottom: 6 }}>Açıklama</label>
          <textarea
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            placeholder="Tüm seçili bloklar için geçerli açıklama..."
            rows={2}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#4b5563', marginBottom: 6 }}>Tarih</label>
          <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!ada || !isKalemi || (!adaGeneli && seciliBloklar.length === 0)}
          style={{
            width: '100%', padding: 14,
            backgroundColor: ada && isKalemi && (adaGeneli || seciliBloklar.length > 0) ? '#f59e0b' : '#e5e7eb',
            border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
            color: ada && isKalemi && (adaGeneli || seciliBloklar.length > 0) ? '#fff' : '#9ca3af',
            cursor: ada && isKalemi && (adaGeneli || seciliBloklar.length > 0) ? 'pointer' : 'not-allowed',
          }}
        >
          {!isKalemi
            ? 'İş Kalemi Seçin'
            : adaGeneli
              ? 'Ada Geneli Rapor Kaydet'
              : seciliBloklar.length > 0
                ? `${seciliBloklar.length} Blok İçin Rapor Kaydet`
                : 'Blok Seçin'}
        </button>
      </div>
    </div>
  );
}
