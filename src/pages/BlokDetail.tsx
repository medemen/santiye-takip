import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { getBlok, getAllKalemler, getGrupByKalem } from '../config/helpers';
import { getBlokProgress, getBlokRaporlari, getBlokGenelIlerleme } from '../stores/reportStore';
import { getSantiyeSefi } from '../stores/kullanicilarStore';
import {
  getHedefler,
  setHedef,
  subscribeHedefChanges,
  hedefDuzetmeYetkisiVarMi,
} from '../stores/hedefStore';
import { getIlerlemeDurumu } from '../data/plan';
import type { IsDurumu } from '../types';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';
import ReportCard from '../components/ReportCard';

function formatTarih(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export default function BlokDetail() {
  const { ada, blokNo } = useParams<{ ada: string; blokNo: string }>();
  const navigate = useNavigate();
  const config = useSiteConfig();
  const blokNum = parseInt(blokNo || '0');

  const blok = getBlok(config, ada!, blokNum);
  const isKalemleri = getAllKalemler(config);

  const progress = getBlokProgress(ada!, blokNum, isKalemleri);
  const genelIlerleme = getBlokGenelIlerleme(ada!, blokNum, isKalemleri);
  const santiyeSefi = getSantiyeSefi(ada!);
  const raporlar = getBlokRaporlari(ada!, blokNum).sort(
    (a, b) => new Date(b.olusturma_tarihi).getTime() - new Date(a.olusturma_tarihi).getTime()
  );
  const blokOzelRaporVar = raporlar.length > 0;

  const hedefler = useSyncExternalStore(subscribeHedefChanges, getHedefler);
  const hedefDuzenleyebilir = hedefDuzetmeYetkisiVarMi();
  const [duzenlenenKalem, setDuzenlenenKalem] = useState<string | null>(null);
  const [duzenlenenTarih, setDuzenlenenTarih] = useState('');

  const progressArray = isKalemleri.map((ik) => {
    const r = progress[ik];
    return { isKalemi: ik, rapor: r, grup: getGrupByKalem(config, ik) };
  });

  const [acikGruplar, setAcikGruplar] = useState<Set<string>>(new Set());
  const ilkRender = useRef(true);

  useEffect(() => {
    if (!ilkRender.current || !ada) return;
    ilkRender.current = false;
    const ilk = new Set<string>();
    for (const g of config.isKalemleri.gruplar) {
      if (g.kalemler.some((k) => progress[k])) ilk.add(g.id);
    }
    setAcikGruplar(ilk);
  }, [progress, ada, config.isKalemleri.gruplar]);

  const toggleGrup = (grupId: string) => {
    setAcikGruplar((prev) => {
      const yeni = new Set(prev);
      if (yeni.has(grupId)) yeni.delete(grupId);
      else yeni.add(grupId);
      return yeni;
    });
  };

  const tamamlanan = progressArray.filter((p) => p.rapor?.durum === 'tamamlandi').length;
  const geciken = progressArray.filter((p) => p.rapor?.durum === 'gecikme').length;
  const devamEden = progressArray.filter((p) => p.rapor?.durum === 'devam_ediyor').length;

  if (!blok) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Blok bulunamadı</div>;
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

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 18,
          marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid #f0f0f0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0 }}>
            {ada} - Blok {blok.blok_no}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6, fontSize: 13, color: '#6b7280' }}>
          <span style={{ fontWeight: 600 }}>{blok.tip}</span>
          <span>|</span>
          <span>{blok.daire_sayisi} Daire</span>
          <span>|</span>
          <span>{blok.kat_sayisi} Kat</span>
          <span>|</span>
          <span>{blok.yapi_konfigurasyonu}</span>
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
          Şantiye Şefi: {santiyeSefi}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: 10,
            backgroundColor: '#f8fafc',
            borderRadius: 10,
            fontSize: 12,
          }}
        >
          <span>✅ {tamamlanan} tamam</span>
          <span>🔵 {devamEden} devam</span>
          <span>⚠️ {geciken} gecikme</span>
          <span style={{ fontWeight: 700, color: '#f59e0b' }}>%{genelIlerleme}</span>
        </div>
      </div>

      {!blokOzelRaporVar && (
        <div
          style={{
            backgroundColor: '#fef3c7',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 12,
            color: '#92400e',
            border: '1px solid #fde68a',
          }}
        >
          ℹ️ Bu blok için özel rapor girilmedi. İlerleme, DURUM TESPİT raporundaki{' '}
          <strong>ada geneli</strong> verilerden gösteriliyor.
        </div>
      )}

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid #f0f0f0',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 12 }}>
          İş Kalemleri Durumu
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {config.isKalemleri.gruplar.map((g) => {
            const acik = acikGruplar.has(g.id);
            const grupKalemleri = progressArray.filter((p) => p.grup?.id === g.id);
            const grupTamam = grupKalemleri.filter((p) => p.rapor?.durum === 'tamamlandi').length;
            return (
              <div key={g.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
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
                      ({grupTamam}/{g.kalemler.length})
                    </span>
                  </span>
                  <span style={{ fontSize: 11, color: '#f59e0b' }}>
                    {acik ? '▾ Kapat' : '▸ Aç'}
                  </span>
                </button>
                {acik && (
                  <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {grupKalemleri.map(({ isKalemi, rapor }) => {
                      const hedef = hedefler.find(
                        (h) => h.ada === ada && h.blok_no === blokNum && h.is_kalemi === isKalemi
                      );
                      const ilerlemeDurumu = getIlerlemeDurumu(rapor, hedef?.hedef_tarih);
                      const duzenleniyor = duzenlenenKalem === isKalemi;
                      return (
                        <div
                          key={isKalemi}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 10px',
                            borderRadius: 10,
                            backgroundColor: rapor?.durum === 'gecikme' ? '#fef2f2' : '#f9fafb',
                          }}
                        >
                          <div style={{ width: 120, fontSize: 12, fontWeight: 500, color: '#374151', flexShrink: 0 }}>
                            {isKalemi}
                          </div>
                          <div style={{ flex: 1 }}>
                            <ProgressBar
                              value={rapor?.durum === 'tamamlandi' ? 100 : rapor?.ilerleme_yuzde ?? 0}
                              height={6}
                              color={rapor?.durum === 'gecikme' ? '#ef4444' : undefined}
                            />
                            <div style={{ marginTop: 4, minHeight: 22, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              {duzenleniyor ? (
                                <>
                                  <input
                                    type="date"
                                    value={duzenlenenTarih}
                                    onChange={(e) => setDuzenlenenTarih(e.target.value)}
                                    style={{
                                      fontSize: 11,
                                      padding: '3px 6px',
                                      borderRadius: 8,
                                      border: '1px solid #e5e7eb',
                                      backgroundColor: '#fff',
                                      color: '#1f2937',
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      setHedef(ada!, blokNum, isKalemi, duzenlenenTarih || null);
                                      setDuzenlenenKalem(null);
                                    }}
                                    style={{
                                      fontSize: 11,
                                      padding: '3px 10px',
                                      borderRadius: 8,
                                      border: 'none',
                                      backgroundColor: '#f59e0b',
                                      color: '#fff',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Kaydet
                                  </button>
                                  <button
                                    onClick={() => setDuzenlenenKalem(null)}
                                    style={{
                                      fontSize: 11,
                                      padding: '3px 8px',
                                      borderRadius: 8,
                                      border: '1px solid #e5e7eb',
                                      backgroundColor: '#fff',
                                      color: '#6b7280',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Vazgeç
                                  </button>
                                </>
                              ) : hedef ? (
                                <>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: ilerlemeDurumu.renk }}>
                                    🎯 {ilerlemeDurumu.label}
                                  </span>
                                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                                    Hedef: {formatTarih(hedef.hedef_tarih)}
                                  </span>
                                  {hedefDuzenleyebilir && (
                                    <button
                                      onClick={() => {
                                        setDuzenlenenTarih(hedef.hedef_tarih);
                                        setDuzenlenenKalem(isKalemi);
                                      }}
                                      style={{
                                        fontSize: 11,
                                        padding: '2px 8px',
                                        borderRadius: 8,
                                        border: '1px solid #e5e7eb',
                                        backgroundColor: '#fff',
                                        color: '#6b7280',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      ✎
                                    </button>
                                  )}
                                </>
                              ) : hedefDuzenleyebilir ? (
                                <button
                                  onClick={() => {
                                    setDuzenlenenTarih('');
                                    setDuzenlenenKalem(isKalemi);
                                  }}
                                  style={{
                                    fontSize: 11,
                                    padding: '3px 10px',
                                    borderRadius: 8,
                                    border: '1px dashed #d1d5db',
                                    backgroundColor: '#fff',
                                    color: '#9ca3af',
                                    cursor: 'pointer',
                                  }}
                                >
                                  🎯 Hedef Belirle
                                </button>
                              ) : null}
                            </div>
                          </div>
                          <div style={{ width: 100, textAlign: 'right', flexShrink: 0 }}>
                            {rapor ? (
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'flex-end' }}>
                                {rapor.blok_no === 0 && blokNum !== 0 && (
                                  <span
                                    style={{
                                      fontSize: 9,
                                      backgroundColor: '#fef3c7',
                                      color: '#92400e',
                                      padding: '1px 6px',
                                      borderRadius: 8,
                                      whiteSpace: 'nowrap',
                                    }}
                                    title="Bu kalem için blok özel raporu yok; ada geneli rapor geçerli"
                                  >
                                    Ada Geneli
                                  </span>
                                )}
                                <StatusBadge durum={rapor.durum as IsDurumu} size="sm" />
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: '#9ca3af' }}>—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => navigate(`/rapor-ekle?ada=${ada}&blok=${blok.blok_no}`)}
          style={{
            flex: 1,
            padding: '12px 20px',
            backgroundColor: '#f59e0b',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Rapor Ekle
        </button>
        <button
          onClick={() => navigate(`/raporlar?ada=${ada}&blok=${blok.blok_no}`)}
          style={{
            flex: 1,
            padding: '12px 20px',
            backgroundColor: '#f3f4f6',
            color: '#4b5563',
            border: 'none',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Raporları Gör
        </button>
      </div>

      {raporlar.length > 0 && (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #f0f0f0',
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 12 }}>
            Rapor Geçmişi ({raporlar.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {raporlar.map((r) => (
              <ReportCard key={r.id} rapor={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
