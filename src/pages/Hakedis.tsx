import { useMemo, useState } from 'react';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useRaporlar } from '../hooks/useRaporlar';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { getAdaList } from '../config/helpers';
import {
  getGrupUygulamaIlerleme,
  getGrupAgirlikliAdaIlerleme,
  getProjeAgirlikliIlerleme,
  getKalemAdaIlerleme,
  getSonRapor,
  saveRapor,
  updateRapor,
} from '../stores/reportStore';
import { getCurrentUser } from '../stores/authStore';
import type { IsDurumu } from '../types';
import ProgressBar from '../components/ProgressBar';
import { card, pageTitle } from '../utils/styles';

const DURUM_RENKLERI: Record<IsDurumu, string> = {
  planlandi: '#f59e0b',
  devam_ediyor: '#3b82f6',
  tamamlandi: '#22c55e',
  gecikme: '#ef4444',
};

const DISIPLIN_RENKLERI: Record<string, string> = {
  İNŞ: '#f59e0b',
  MEK: '#3b82f6',
  ELK: '#8b5cf6',
};

function farkRengi(fark: number): string {
  if (Math.abs(fark) < 1) return 'var(--text-faint)';
  return fark > 0 ? '#22c55e' : '#ef4444';
}

export default function Hakedis() {
  const config = useSiteConfig();
  useRaporlar();
  const isDesktop = useIsDesktop();
  const hk = config.hakedis;

  const adalar = useMemo(() => getAdaList(config), [config]);
  const [seciliAda, setSeciliAda] = useState<string>('TÜMÜ');
  const [acikGruplar, setAcikGruplar] = useState<Set<string>>(new Set());
  const [duzenleme, setDuzenleme] = useState<Record<string, { yuzde: number; durum: IsDurumu }>>({});

  const gruplar = useMemo(() => {
    if (!hk) return [];
    return Object.entries(hk.gruplar)
      .map(([id, meta]) => ({ id, ...meta }))
      .sort((a, b) => a.sira - b.sira);
  }, [hk]);

  const projeUygulama = useMemo(
    () => (hk ? getProjeAgirlikliIlerleme(adalar.map((a) => ({ ada: a.ada, bloklar: a.bloklar }))) : null),
    [adalar, hk]
  );
  const seciliUygulama = useMemo(() => {
    if (!hk) return null;
    if (seciliAda === 'TÜMÜ') return projeUygulama;
    const bloklar = adalar.find((a) => a.ada === seciliAda)?.bloklar ?? [];
    return getGrupAgirlikliAdaIlerleme(seciliAda, bloklar);
  }, [seciliAda, projeUygulama, adalar, hk]);
  const seciliResmi = useMemo(() => {
    if (!hk) return null;
    if (seciliAda === 'TÜMÜ') return hk.ilerlemeIcmal.toplam?.kum ?? null;
    const disiplinler = ['İNŞ', 'MEK', 'ELK'];
    const degerler: number[] = [];
    for (const d of disiplinler) {
      const v = hk.ilerlemeIcmal.adalar[seciliAda]?.[d]?.kum;
      if (v !== null && v !== undefined) degerler.push(v);
    }
    if (degerler.length === 0) return null;
    return degerler.reduce((s, v) => s + v, 0);
  }, [seciliAda, hk]);

  if (!hk) {
    return (
      <div style={{ ...card, padding: 40, textAlign: 'center', color: 'var(--text-subtle)', fontSize: 14 }}>
        Hakediş verisi bulunamadı. Config üretimini çalıştırın (npm run build:config).
      </div>
    );
  }
  const hakedis = hk;

  const adaBloklar = (ada: string) => adalar.find((a) => a.ada === ada)?.bloklar ?? [];

  function grupDegeri(grupId: string, ada: string, alan: 'pursantaj' | 'uygulama' | 'resmi'): number | null {
    if (ada === 'TÜMÜ') {
      let purToplam = 0;
      let degerToplam = 0;
      let sayac = 0;
      for (const a of adalar) {
        const pur = hakedis.adalar[a.ada]?.gruplar?.[grupId];
        if (!pur) continue;
        purToplam += pur;
        if (alan === 'uygulama') {
          const u = getGrupUygulamaIlerleme(a.ada, a.bloklar, grupId);
          if (u === null) continue;
          degerToplam += pur * u;
          sayac++;
        } else if (alan === 'resmi') {
          const r = hakedis.grupIlerleme?.[a.ada]?.[grupId]?.imalat_yuzde;
          if (r === undefined) continue;
          degerToplam += pur * r;
          sayac++;
        }
      }
      if (alan === 'pursantaj') return purToplam;
      return sayac > 0 && purToplam > 0 ? degerToplam / purToplam : null;
    }
    if (alan === 'pursantaj') return hakedis.adalar[ada]?.gruplar?.[grupId] ?? null;
    if (alan === 'uygulama') return getGrupUygulamaIlerleme(ada, adaBloklar(ada), grupId);
    return hakedis.grupIlerleme?.[ada]?.[grupId]?.imalat_yuzde ?? null;
  }

  const yuvarla = (v: number | null | undefined): number | string => {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    return Math.round(v * 10) / 10;
  };

  function grupHesapla(grupId: string, ada: string) {
    const pursantaj = grupDegeri(grupId, ada, 'pursantaj');
    const uygulama = grupDegeri(grupId, ada, 'uygulama');
    const resmi = grupDegeri(grupId, ada, 'resmi');
    const fark =
      uygulama !== null && resmi !== null && pursantaj !== null && pursantaj > 0
        ? (uygulama - resmi) * (pursantaj / 100)
        : null;
    return { pursantaj, uygulama, resmi, fark };
  }

  function eşlenenKalemler(grupId: string): string[] {
    return Object.keys(hakedis.kalemEslesme)
      .filter((k) => hakedis.kalemEslesme[k] === grupId)
      .sort();
  }

  function toggleGrup(grupId: string) {
    setAcikGruplar((prev) => {
      const next = new Set(prev);
      if (next.has(grupId)) next.delete(grupId);
      else next.add(grupId);
      return next;
    });
    if (!acikGruplar.has(grupId)) {
      const kalemler = eşlenenKalemler(grupId);
      const baslangic: Record<string, { yuzde: number; durum: IsDurumu }> = {};
      for (const kalem of kalemler) {
        const mevcut = getSonRapor(seciliAda === 'TÜMÜ' ? (adalar[0]?.ada ?? '') : seciliAda, 0, kalem);
        if (mevcut) {
          baslangic[kalem] = {
            yuzde: mevcut.durum === 'tamamlandi' ? 100 : mevcut.ilerleme_yuzde,
            durum: mevcut.durum,
          };
        } else {
          const blokOrt = getKalemAdaIlerleme(
            seciliAda === 'TÜMÜ' ? (adalar[0]?.ada ?? '') : seciliAda,
            seciliAda === 'TÜMÜ' ? adaBloklar(adalar[0]?.ada ?? '') : adaBloklar(seciliAda),
            kalem
          );
          baslangic[kalem] = { yuzde: blokOrt ?? 0, durum: 'devam_ediyor' };
        }
      }
      setDuzenleme(baslangic);
    }
  }

  function kaydet(kalem: string) {
    const deger = duzenleme[kalem];
    if (!deger) return;
    if (seciliAda === 'TÜMÜ') return;
    const kullanici = getCurrentUser();
    const tarih = new Date().toISOString().slice(0, 10);
    const mevcut = getSonRapor(seciliAda, 0, kalem);
    const ilerleme_yuzde = deger.durum === 'tamamlandi' ? 100 : Math.max(0, Math.min(100, Math.round(deger.yuzde)));
    if (mevcut) {
      updateRapor(mevcut.id, { ilerleme_yuzde, durum: deger.durum });
    } else {
      saveRapor({
        tarih,
        raporlayan: kullanici?.ad_soyad ?? 'Hakediş',
        ada: seciliAda,
        blok_no: 0,
        is_kalemi: kalem,
        durum: deger.durum,
        ilerleme_yuzde,
        aciklama: 'Hakediş karşılaştırmasından güncellendi',
      });
    }
  }

  function adaKarti(ada: string) {
    const uygulama = getGrupAgirlikliAdaIlerleme(ada, adaBloklar(ada));
    return {
      ada,
      uygulama,
      resmi: hakedis.grupIlerleme?.[ada] ? Object.values(hakedis.grupIlerleme[ada]).reduce((s, g) => s + g.gerceklesen, 0) : null,
      pursantaj: hakedis.adalar[ada]?.genel ?? null,
    };
  }

  if (isDesktop) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h1 style={{ ...pageTitle, marginBottom: 4 }}>Hakediş Karşılaştırma</h1>
            <p style={{ fontSize: 13, color: 'var(--text-faint)', margin: 0 }}>
              {hakedis.hakedisNo}. hakediş · Uygulama (saha) vs Resmi ({hakedis.kaynak})
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 500, marginBottom: 4 }}>Proje Geneli Uygulama</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{yuvarla(seciliUygulama)}%</div>
            <div style={{ marginTop: 8 }}><ProgressBar value={yuvarla(seciliUygulama) === '—' ? 0 : (seciliUygulama as number)} height={8} /></div>
          </div>
          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 500, marginBottom: 4 }}>Resmi Hakediş İlerlemesi</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{yuvarla(seciliResmi)}%</div>
            <div style={{ marginTop: 8 }}><ProgressBar value={yuvarla(seciliResmi) === '—' ? 0 : (seciliResmi as number)} height={8} /></div>
          </div>
          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 500, marginBottom: 4 }}>Fark</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-faint)' }}>
              {seciliUygulama !== null && seciliResmi !== null ? `${Math.round((seciliUygulama - seciliResmi) * 10) / 10} pp` : '—'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <button
            onClick={() => setSeciliAda('TÜMÜ')}
            style={{
              padding: '8px 14px', borderRadius: 20, border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 13,
              fontWeight: 600, backgroundColor: seciliAda === 'TÜMÜ' ? 'var(--bg-accent)' : 'var(--bg-card)', color: seciliAda === 'TÜMÜ' ? 'var(--accent-dark)' : 'var(--text-muted)',
            }}
          >
            Tümü
          </button>
          {adalar.map((a) => (
            <button
              key={a.ada}
              onClick={() => setSeciliAda(a.ada)}
              style={{
                padding: '8px 14px', borderRadius: 20, border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 13,
                fontWeight: 600, backgroundColor: seciliAda === a.ada ? 'var(--bg-accent)' : 'var(--bg-card)', color: seciliAda === a.ada ? 'var(--accent-dark)' : 'var(--text-muted)',
              }}
            >
              {a.ada}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 16 }}>
          {adalar.map((a) => {
            const k = adaKarti(a.ada);
            return (
              <div key={a.ada} style={{ ...card, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{a.ada}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>%{yuvarla(k.pursantaj)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>Uygulama</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{yuvarla(k.uygulama)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#3b82f6', fontWeight: 600 }}>Resmi</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{yuvarla(k.resmi)}%</span>
                </div>
                <div style={{ marginTop: 8 }}><ProgressBar value={yuvarla(k.uygulama) === '—' ? 0 : (k.uygulama as number)} height={6} color="#f59e0b" /></div>
              </div>
            );
          })}
        </div>

        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 8, padding: '10px 16px', fontSize: 11, color: 'var(--text-subtle)', fontWeight: 700, borderBottom: '1px solid #f0f0f0' }}>
            <span>İmalat Grubu</span>
            <span style={{ textAlign: 'right' }}>Pursantaj</span>
            <span style={{ textAlign: 'right' }}>Uygulama</span>
            <span style={{ textAlign: 'right' }}>Resmi</span>
            <span style={{ textAlign: 'right' }}>Fark</span>
          </div>
          {gruplar.map((g) => {
            const h = grupHesapla(g.id, seciliAda);
            const acik = acikGruplar.has(g.id);
            const kalemler = eşlenenKalemler(g.id);
            return (
              <div key={g.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <div
                  onClick={() => toggleGrup(g.id)}
                  style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 8, alignItems: 'center', padding: '10px 16px', cursor: 'pointer', backgroundColor: acik ? 'var(--bg-accent-soft)' : 'var(--bg-card)' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', minWidth: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: DISIPLIN_RENKLERI[g.disiplin], flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.ad}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-subtle)', fontWeight: 500 }}>{g.disiplin}</span>
                    <span style={{ fontSize: 11, color: '#f59e0b' }}>{acik ? '▲' : '▼'}</span>
                  </span>
                  <span style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-muted)' }}>{yuvarla(h.pursantaj)}</span>
                  <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: h.uygulama !== null ? '#f59e0b' : 'var(--text-subtle)' }}>{yuvarla(h.uygulama)}</span>
                  <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: h.resmi !== null ? '#3b82f6' : 'var(--text-subtle)' }}>{yuvarla(h.resmi)}</span>
                  <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: h.fark !== null ? farkRengi(h.fark) : 'var(--text-subtle)' }}>{h.fark !== null ? yuvarla(h.fark) : '—'}</span>
                </div>
                {acik && (
                  <div style={{ padding: '4px 16px 12px', backgroundColor: 'var(--bg-accent-soft)', borderTop: '1px dashed #fde68a' }}>
                    {kalemler.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text-subtle)', padding: '8px 0' }}>
                        Bu gruba eşlenmiş iş kalemi yok.
                      </div>
                    )}
                    {kalemler.map((kalem) => {
                      const duzen = duzenleme[kalem] ?? { yuzde: 0, durum: 'devam_ediyor' as IsDurumu };
                      const mevcut = getSonRapor(seciliAda === 'TÜMÜ' ? (adalar[0]?.ada ?? '') : seciliAda, 0, kalem);
                      return (
                        <div key={kalem} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr auto', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #fef3c7' }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 0 }}>
                            {kalem}
                            {mevcut && <span style={{ fontSize: 10, color: 'var(--text-subtle)', marginLeft: 6 }}>rapor: {mevcut.raporlayan}</span>}
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={duzen.yuzde}
                            disabled={seciliAda === 'TÜMÜ'}
                            onChange={(e) => setDuzenleme({ ...duzenleme, [kalem]: { ...duzen, yuzde: Number(e.target.value) } })}
                            style={{ width: '100%', accentColor: '#f59e0b' }}
                          />
                          <span style={{ fontSize: 12, fontWeight: 700, color: DURUM_RENKLERI[duzen.durum], textAlign: 'right' }}>
                            %{duzen.yuzde}
                          </span>
                          <select
                            value={duzen.durum}
                            disabled={seciliAda === 'TÜMÜ'}
                            onChange={(e) => {
                              const durum = e.target.value as IsDurumu;
                              setDuzenleme({ ...duzenleme, [kalem]: { ...duzen, durum } });
                            }}
                            style={{ fontSize: 11, padding: '4px 6px', borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                          >
                            <option value="planlandi">Planlandı</option>
                            <option value="devam_ediyor">Devam</option>
                            <option value="tamamlandi">Tamam</option>
                            <option value="gecikme">Gecikme</option>
                          </select>
                          {seciliAda !== 'TÜMÜ' && (
                            <button
                              onClick={() => kaydet(kalem)}
                              style={{ fontSize: 11, padding: '5px 10px', borderRadius: 8, border: 'none', backgroundColor: '#f59e0b', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Kaydet
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {seciliAda === 'TÜMÜ' && (
                      <div style={{ fontSize: 11, color: 'var(--accent-dark)', paddingTop: 8 }}>
                        Kalem bazlı düzenleme için bir ada seçin.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ ...pageTitle, marginBottom: 4 }}>Hakediş</h1>
      <p style={{ fontSize: 13, color: 'var(--text-faint)', margin: 0, marginBottom: 16 }}>
        {hakedis.hakedisNo}. hakediş · Uygulama vs Resmi
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ ...card, padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 4 }}>Uygulama</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{yuvarla(seciliUygulama)}%</div>
        </div>
        <div style={{ ...card, padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 4 }}>Resmi</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{yuvarla(seciliResmi)}%</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={() => setSeciliAda('TÜMÜ')} style={{ padding: '8px 14px', borderRadius: 20, border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 13, fontWeight: 600, backgroundColor: seciliAda === 'TÜMÜ' ? 'var(--bg-accent)' : 'var(--bg-card)', color: seciliAda === 'TÜMÜ' ? 'var(--accent-dark)' : 'var(--text-muted)' }}>
          Tümü
        </button>
        {adalar.map((a) => (
          <button key={a.ada} onClick={() => setSeciliAda(a.ada)} style={{ padding: '8px 14px', borderRadius: 20, border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 13, fontWeight: 600, backgroundColor: seciliAda === a.ada ? 'var(--bg-accent)' : 'var(--bg-card)', color: seciliAda === a.ada ? 'var(--accent-dark)' : 'var(--text-muted)' }}>
            {a.ada}
          </button>
        ))}
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {gruplar.map((g) => {
          const h = grupHesapla(g.id, seciliAda);
          const acik = acikGruplar.has(g.id);
          const kalemler = eşlenenKalemler(g.id);
          return (
            <div key={g.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
              <div onClick={() => toggleGrup(g.id)} style={{ padding: '12px 14px', cursor: 'pointer', backgroundColor: acik ? 'var(--bg-accent-soft)' : 'var(--bg-card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: DISIPLIN_RENKLERI[g.disiplin], flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{g.ad}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{g.disiplin} {acik ? '▲' : '▼'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-subtle)' }}>Pursantaj</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{yuvarla(h.pursantaj)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-subtle)' }}>Uygulama</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: h.uygulama !== null ? '#f59e0b' : 'var(--text-subtle)' }}>{yuvarla(h.uygulama)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-subtle)' }}>Resmi</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: h.resmi !== null ? '#3b82f6' : 'var(--text-subtle)' }}>{yuvarla(h.resmi)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-subtle)' }}>Fark</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: h.fark !== null ? farkRengi(h.fark) : 'var(--text-subtle)' }}>{h.fark !== null ? yuvarla(h.fark) : '—'}</div>
                  </div>
                </div>
                {h.uygulama !== null && <div style={{ marginTop: 6 }}><ProgressBar value={h.uygulama} height={5} /></div>}
              </div>
              {acik && (
                <div style={{ padding: '4px 14px 12px', backgroundColor: 'var(--bg-accent-soft)', borderTop: '1px dashed #fde68a' }}>
                  {kalemler.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-subtle)', padding: '8px 0' }}>Bu gruba eşlenmiş iş kalemi yok.</div>}
                  {kalemler.map((kalem) => {
                    const duzen = duzenleme[kalem] ?? { yuzde: 0, durum: 'devam_ediyor' as IsDurumu };
                    return (
                      <div key={kalem} style={{ padding: '8px 0', borderBottom: '1px solid #fef3c7' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{kalem}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: DURUM_RENKLERI[duzen.durum] }}>%{duzen.yuzde}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="range" min={0} max={100} step={1} value={duzen.yuzde} disabled={seciliAda === 'TÜMÜ'} onChange={(e) => setDuzenleme({ ...duzenleme, [kalem]: { ...duzen, yuzde: Number(e.target.value) } })} style={{ flex: 1, accentColor: '#f59e0b' }} />
                          <select value={duzen.durum} disabled={seciliAda === 'TÜMÜ'} onChange={(e) => { const durum = e.target.value as IsDurumu; setDuzenleme({ ...duzenleme, [kalem]: { ...duzen, durum } }); }} style={{ fontSize: 11, padding: '4px 6px', borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                            <option value="planlandi">Planlandı</option>
                            <option value="devam_ediyor">Devam</option>
                            <option value="tamamlandi">Tamam</option>
                            <option value="gecikme">Gecikme</option>
                          </select>
                          {seciliAda !== 'TÜMÜ' && (
                            <button onClick={() => kaydet(kalem)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 8, border: 'none', backgroundColor: '#f59e0b', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                              Kaydet
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {seciliAda === 'TÜMÜ' && <div style={{ fontSize: 11, color: 'var(--accent-dark)', paddingTop: 8 }}>Kalem bazlı düzenleme için bir ada seçin.</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
