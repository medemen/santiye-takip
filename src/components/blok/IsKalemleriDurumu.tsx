import { useEffect, useRef, useState } from 'react';
import type { ImalatGrubu } from '../../config/types';
import type { IsDurumu, IsKalemiHedefi, Rapor } from '../../types';
import { setHedef } from '../../stores/hedefStore';
import { getIlerlemeDurumu } from '../../data/plan';
import ProgressBar from '../ProgressBar';
import StatusBadge from '../StatusBadge';

export interface KalemIlerlemesi {
  isKalemi: string;
  rapor: Rapor | null;
  grup: ImalatGrubu | undefined;
}

interface Props {
  ada: string;
  blokNum: number;
  gruplar: ImalatGrubu[];
  kalemIlerlemeleri: KalemIlerlemesi[];
  hedefler: IsKalemiHedefi[];
  hedefDuzenleyebilir: boolean;
}

function formatTarih(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export default function IsKalemleriDurumu({ ada, blokNum, gruplar, kalemIlerlemeleri, hedefler, hedefDuzenleyebilir }: Props) {
  const [acikGruplar, setAcikGruplar] = useState<Set<string>>(new Set());
  const [duzenlenenKalem, setDuzenlenenKalem] = useState<string | null>(null);
  const [duzenlenenTarih, setDuzenlenenTarih] = useState('');
  const ilkRender = useRef(true);

  useEffect(() => {
    if (!ilkRender.current || !ada) return;
    ilkRender.current = false;
    const raporluKalemler = new Set(kalemIlerlemeleri.filter((p) => p.rapor).map((p) => p.isKalemi));
    const ilk = new Set<string>();
    for (const g of gruplar) {
      if (g.kalemler.some((k) => raporluKalemler.has(k))) ilk.add(g.id);
    }
    setAcikGruplar(ilk);
  }, [ada, gruplar, kalemIlerlemeleri]);

  const toggleGrup = (grupId: string) => {
    setAcikGruplar((prev) => {
      const yeni = new Set(prev);
      if (yeni.has(grupId)) yeni.delete(grupId);
      else yeni.add(grupId);
      return yeni;
    });
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #f0f0f0',
      }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', margin: 0, marginBottom: 12 }}>
        İş Kalemleri Durumu
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {gruplar.map((g) => {
          const acik = acikGruplar.has(g.id);
          const grupKalemleri = kalemIlerlemeleri.filter((p) => p.grup?.id === g.id);
          const grupTamam = grupKalemleri.filter((p) => p.rapor?.durum === 'tamamlandi').length;
          return (
            <div key={g.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
              <button
                onClick={() => toggleGrup(g.id)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: acik ? 'var(--bg-accent)' : 'var(--bg-hover)',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  {g.ad}{' '}
                  <span style={{ fontWeight: 400, color: 'var(--text-subtle)' }}>
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
                          backgroundColor: rapor?.durum === 'gecikme' ? 'var(--bg-danger)' : 'var(--bg-hover)',
                        }}
                      >
                        <div style={{ width: 120, fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', flexShrink: 0 }}>
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
                                    backgroundColor: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    setHedef(ada, blokNum, isKalemi, duzenlenenTarih || null);
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
                                    backgroundColor: 'var(--bg-card)',
                                    color: 'var(--text-faint)',
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
                                <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
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
                                      backgroundColor: 'var(--bg-card)',
                                      color: 'var(--text-faint)',
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
                                  backgroundColor: 'var(--bg-card)',
                                  color: 'var(--text-subtle)',
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
                                    backgroundColor: 'var(--bg-accent)',
                                    color: 'var(--accent-dark)',
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
                            <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>—</span>
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
  );
}
