import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { blokData } from '../data/blokData';
import { IS_KALEMLERI, IMALAT_GRUPLARI, DURUM_LABELLARI } from '../data/isKalemleri';
import { SABLONLAR, getSablonKalemleri } from '../data/sablonlar';
import { saveRapor, updateRapor, getRaporById } from '../store/reportStore';
import { getCurrentUser } from '../store/authStore';
import { getKullaniciAdaAtamasi, getKullaniciBloklari } from '../store/atamaStore';
import type { IsDurumu } from '../types';
import { todayISO } from '../utils/helpers';
import { toastGoster } from '../store/toastStore';

type Step = 'ada' | 'blok' | 'is_kalemi' | 'detay';

export default function ReportAdd() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preAda = searchParams.get('ada') || '';
  const preBlok = searchParams.get('blok') || '';
  const editId = searchParams.get('edit') || '';

  const user = getCurrentUser();
  const kullaniciAdi = user?.ad_soyad ?? '';
  const editMode = !!editId;

  const atananAda = getKullaniciAdaAtamasi(kullaniciAdi);
  const userBloklar = atananAda ? getKullaniciBloklari(kullaniciAdi, atananAda) : [];

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

  const [step, setStep] = useState<Step>(
    editId ? 'detay' : preAda ? 'blok' : 'ada'
  );
  const [ada, setAda] = useState(preAda);
  const [blokNo, setBlokNo] = useState(preBlok ? parseInt(preBlok) : 0);
  const [isKalemi, setIsKalemi] = useState('');
  const [durum, setDurum] = useState<IsDurumu>('devam_ediyor');
  const [ilerleme, setIlerleme] = useState(50);
  const [aciklama, setAciklama] = useState('');
  const [tarih, setTarih] = useState(todayISO());
  const [acikGruplar, setAcikGruplar] = useState<Set<string>>(new Set());
  const [kalemArama, setKalemArama] = useState('');

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

  const adaData = ada ? blokData.adalar.find((a) => a.ada === ada) : null;

  const getBlokFiltre = () => {
    if (!ada) return [];
    if (user?.admin) {
      const blokAtama = getKullaniciBloklari(kullaniciAdi, ada);
      return blokAtama.length > 0 ? blokAtama : adaData?.bloklar.map((b) => b.blok_no) ?? [];
    }
    if (atananAda === ada) {
      return userBloklar.length > 0 ? userBloklar : adaData?.bloklar.map((b) => b.blok_no) ?? [];
    }
    return [];
  };

  const toggleGrup = (grupId: string) => {
    setAcikGruplar((prev) => {
      const yeni = new Set(prev);
      if (yeni.has(grupId)) yeni.delete(grupId);
      else yeni.add(grupId);
      return yeni;
    });
  };

  const kaydetRapor = (): boolean => {
    if (!ada || !isKalemi || !user) return false;
    if (editMode && editId) {
      updateRapor(editId, {
        tarih,
        raporlayan: kullaniciAdi,
        ada,
        blok_no: blokNo,
        is_kalemi: isKalemi,
        durum,
        ilerleme_yuzde: durum === 'tamamlandi' ? 100 : ilerleme,
        aciklama,
      });
      toastGoster('Rapor güncellendi', 'success');
    } else {
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
      toastGoster('Rapor kaydedildi', 'success');
    }
    return true;
  };

  const handleSubmit = () => {
    if (kaydetRapor()) navigate('/raporlar');
  };

  const handleKaydetVeDevamEt = () => {
    if (editMode) {
      if (kaydetRapor()) navigate('/raporlar');
      return;
    }
    if (kaydetRapor()) {
      setIsKalemi('');
      setDurum('devam_ediyor');
      setIlerleme(50);
      setAciklama('');
      setStep('is_kalemi');
    }
  };

  const kalemButonlari = (kalemler: readonly string[]) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {kalemler.map((ik) => (
        <button
          key={ik}
          onClick={() => {
            setIsKalemi(ik);
            setStep('detay');
          }}
          style={{
            padding: '10px 8px',
            backgroundColor: isKalemi === ik ? '#f59e0b' : '#f9fafb',
            border: '1px solid',
            borderColor: isKalemi === ik ? '#f59e0b' : '#e5e7eb',
            borderRadius: 10,
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
  );

  const renderStepIndicator = () => {
    const steps = ['ada', 'blok', 'is_kalemi', 'detay'] as Step[];
    const labels = ['Ada', 'Blok', 'İş Kalemi', 'Detay'];
    const currentIdx = steps.indexOf(step);
    return (
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {steps.map((s, i) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: i <= currentIdx ? '#f59e0b' : '#e5e7eb',
              transition: 'background-color 0.3s',
            }}
          />
        ))}
        <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', width: '100%', marginTop: 4 }}>
          {labels[currentIdx]} ({currentIdx + 1}/4)
        </div>
      </div>
    );
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
            {user?.admin ? ' Personel sayfasından atama yapabilirsiniz.' : ''}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>
        {editMode ? 'Rapor Düzenle' : 'Rapor Ekle'}
      </h1>
      <p style={{ fontSize: 13, color: '#6b7280', margin: 0, marginBottom: 16 }}>
        {editMode ? 'Mevcut raporu güncelleyin' : 'Blok ilerleme durumunu raporlayın'}
      </p>

      {renderStepIndicator()}

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid #f0f0f0',
        }}
      >
        {/* ADIM 1: Ada Seçimi */}
        {step === 'ada' && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
              Ada Seçin
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gosterilecekAdalar.map((a) => (
                <button
                  key={a.ada}
                  onClick={() => {
                    setAda(a.ada);
                    setStep('blok');
                  }}
                  style={{
                    padding: '14px 16px',
                    backgroundColor: '#f8fafc',
                    border: '2px solid #e5e7eb',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#1f2937',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {a.ada} — {a.blok_sayisi} Blok
                  <div style={{ fontSize: 12, fontWeight: 400, color: '#6b7280', marginTop: 2 }}>
                    {a.toplam_daire} daire, {a.toplam_kat} kat
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ADIM 2: Blok Seçimi */}
        {step === 'blok' && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
              {ada} — Blok Seçin
            </h3>
            <button
              onClick={() => {
                setBlokNo(0);
                setStep('is_kalemi');
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                marginBottom: 10,
                backgroundColor: blokNo === 0 ? '#f59e0b' : '#fef3c7',
                border: blokNo === 0 ? 'none' : '2px solid #f59e0b',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                color: blokNo === 0 ? '#fff' : '#92400e',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              Ada Geneli (Tüm Bloklar)
              <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.85 }}>
                Tek raporla tüm bloklar için geçerli ilerleme kaydedin
              </div>
            </button>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
                gap: 8,
                marginBottom: 16,
              }}
            >
              {adaData?.bloklar
                .filter((b) => getBlokFiltre().includes(b.blok_no))
                .map((b) => (
                  <button
                    key={b.blok_no}
                    onClick={() => {
                      setBlokNo(b.blok_no);
                      setStep('is_kalemi');
                    }}
                    style={{
                      padding: 10,
                      backgroundColor: blokNo === b.blok_no ? '#f59e0b' : '#f3f4f6',
                      border: 'none',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      color: blokNo === b.blok_no ? '#fff' : '#4b5563',
                      cursor: 'pointer',
                    }}
                  >
                    {b.blok_no}
                  </button>
                ))}
            </div>
            <button
              onClick={() => setStep('ada')}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              ← Geri
            </button>
          </div>
        )}

        {/* ADIM 3: İş Kalemi Seçimi */}
        {step === 'is_kalemi' && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              {ada} - {blokNo === 0 ? 'Ada Geneli' : `Blok ${blokNo}`} — İş Kalemi
            </h3>

            {!editMode && SABLONLAR.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>
                  Hızlı Şablon
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SABLONLAR.map((s) => {
                    const kalemler = getSablonKalemleri(s);
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (kalemler.length === 1) {
                            setIsKalemi(kalemler[0]);
                            setStep('detay');
                          } else {
                            const secim = window.prompt(`"${s.ad}" şablonu seçildi. İş kalemi seçin:\n${kalemler.map((ik, i) => `${i + 1}. ${ik}`).join('\n')}`);
                            if (secim) {
                              const idx = parseInt(secim) - 1;
                              if (idx >= 0 && idx < kalemler.length) {
                                setIsKalemi(kalemler[idx]);
                                setDurum(s.varsayilan_durum as IsDurumu);
                                setStep('detay');
                              }
                            }
                          }
                        }}
                        style={{
                          padding: '6px 12px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b',
                          borderRadius: 8, fontSize: 11, fontWeight: 500, color: '#92400e',
                          cursor: 'pointer',
                        }}
                        title={s.aciklama}
                      >
                        📋 {s.ad}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                placeholder="İş kalemi ara..."
                value={kalemArama}
                onChange={(e) => setKalemArama(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {kalemArama ? (
              <div style={{ marginBottom: 16 }}>
                {kalemButonlari(
                  IS_KALEMLERI.filter((ik) =>
                    ik.toLowerCase().includes(kalemArama.toLowerCase())
                  )
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {IMALAT_GRUPLARI.map((g) => {
                  const acik = acikGruplar.has(g.id);
                  return (
                    <div
                      key={g.id}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: 10,
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        onClick={() => toggleGrup(g.id)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: acik ? '#fef3c7' : '#f9fafb',
                          border: 'none',
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#374151',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>
                          {g.ad}{' '}
                          <span style={{ fontWeight: 400, color: '#9ca3af' }}>
                            ({g.kalemler.length})
                          </span>
                        </span>
                        <span style={{ fontSize: 11, color: '#f59e0b' }}>
                          {acik ? '▾ Kapat' : '▸ Aç'}
                        </span>
                      </button>
                      {acik && (
                        <div style={{ padding: 10, backgroundColor: '#fff' }}>
                          {kalemButonlari(g.kalemler)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <button
              onClick={() => setStep('blok')}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              ← Geri
            </button>
          </div>
        )}

        {/* ADIM 4: Detay */}
        {step === 'detay' && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
              {ada} - {blokNo === 0 ? 'Ada Geneli' : `Blok ${blokNo}`} — {isKalemi}
            </h3>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#4b5563', marginBottom: 6 }}>
                Durum
              </label>
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

            {durum !== 'tamamlandi' && durum !== 'planlandi' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#4b5563', marginBottom: 6 }}>
                  İlerleme: %{ilerleme}
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={ilerleme}
                  onChange={(e) => setIlerleme(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
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

            <div style={{ marginBottom: 16 }}>
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

            <div style={{ marginBottom: 16 }}>
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

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setStep('is_kalemi')}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#4b5563',
                  cursor: 'pointer',
                }}
              >
                ← Geri
              </button>
              {!editMode && (
                <button
                  onClick={handleKaydetVeDevamEt}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#dbeafe',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#1e40af',
                    cursor: 'pointer',
                  }}
                >
                  Kaydet ve Devam Et
                </button>
              )}
              <button
                onClick={handleSubmit}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f59e0b',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                {editMode ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
