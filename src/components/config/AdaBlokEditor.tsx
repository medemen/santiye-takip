import { useState } from 'react';
import type { AdaBlok, BlokYapisi } from '../../config/types';
import { adaBloklariniYenidenUret, adaTamamla, bosBlok } from '../../config/editor';

interface Props {
  adalar: AdaBlok[];
  onChange: (adalar: AdaBlok[]) => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  fontSize: 13,
  boxSizing: 'border-box',
  backgroundColor: '#fff',
  color: '#1f2937',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 500,
  color: '#6b7280',
  marginBottom: 4,
};

export default function AdaBlokEditor({ adalar, onChange }: Props) {
  const [acik, setAcik] = useState<number | null>(null);
  const [yeniAdaAdi, setYeniAdaAdi] = useState('');
  const [yeniBlokSayisi, setYeniBlokSayisi] = useState(4);
  const [yeniTip, setYeniTip] = useState('TİP-1');
  const [yeniDaire, setYeniDaire] = useState(24);
  const [yeniKat, setYeniKat] = useState(8);

  const adaGuncelle = (idx: number, f: (a: AdaBlok) => AdaBlok) => {
    onChange(adalar.map((a, i) => (i === idx ? adaTamamla(f(a)) : a)));
  };

  const ekleAda = () => {
    const ad = yeniAdaAdi.trim();
    if (!ad) return;
    if (adalar.some((a) => a.ada === ad)) {
      alert(`'${ad}' adı zaten var.`);
      return;
    }
    const n = Math.max(1, Math.floor(yeniBlokSayisi) || 1);
    const bloklar: BlokYapisi[] = Array.from({ length: n }, (_, i) => ({
      blok_no: i + 1,
      tip: yeniTip,
      daire_sayisi: yeniDaire,
      yapi_konfigurasyonu: '',
      kat_sayisi: yeniKat,
    }));
    onChange([
      ...adalar,
      adaTamamla({ ada: ad, blok_sayisi: n, toplam_daire: 0, toplam_kat: 0, bloklar }),
    ]);
    setYeniAdaAdi('');
  };

  const blokGuncelle = (adaIdx: number, blokIdx: number, f: (b: BlokYapisi) => BlokYapisi) => {
    adaGuncelle(adaIdx, (a) => ({
      ...a,
      bloklar: a.bloklar.map((b, i) => (i === blokIdx ? f(b) : b)),
    }));
  };

  return (
    <div>
      <div
        style={{
          backgroundColor: '#f9fafb',
          borderRadius: 10,
          padding: 12,
          marginBottom: 12,
          border: '1px solid #e5e7eb',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
          Yeni Ada Ekle
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <label style={labelStyle}>Ada Adı</label>
            <input
              style={inputStyle}
              value={yeniAdaAdi}
              placeholder="örn. A BLOK"
              onChange={(e) => setYeniAdaAdi(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div>
              <label style={labelStyle}>Blok Sayısı</label>
              <input
                type="number"
                min={1}
                style={inputStyle}
                value={yeniBlokSayisi}
                onChange={(e) => setYeniBlokSayisi(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label style={labelStyle}>Daire/Blok</label>
              <input
                type="number"
                min={0}
                style={inputStyle}
                value={yeniDaire}
                onChange={(e) => setYeniDaire(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label style={labelStyle}>Kat/Blok</label>
              <input
                type="number"
                min={0}
                style={inputStyle}
                value={yeniKat}
                onChange={(e) => setYeniKat(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Blok Tipi</label>
            <input
              style={inputStyle}
              value={yeniTip}
              placeholder="örn. TİP-1"
              onChange={(e) => setYeniTip(e.target.value)}
            />
          </div>
          <button
            onClick={ekleAda}
            style={{
              padding: '10px',
              backgroundColor: '#f59e0b',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            + Ada Ekle
          </button>
        </div>
      </div>

      {adalar.length === 0 && (
        <div style={{ fontSize: 12, color: '#9ca3af', padding: '12px 0' }}>
          Henüz ada tanımlanmadı. Yukarıdan ilk adayı ekleyin.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {adalar.map((a, adaIdx) => {
          const acikMi = acik === adaIdx;
          return (
            <div
              key={`${a.ada}-${adaIdx}`}
              style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  backgroundColor: acikMi ? '#fef3c7' : '#f9fafb',
                }}
              >
                <input
                  style={{ ...inputStyle, width: 120, flexShrink: 0 }}
                  value={a.ada}
                  onChange={(e) => {
                    const yeniAd = e.target.value;
                    adaGuncelle(adaIdx, (x) => ({ ...x, ada: yeniAd }));
                  }}
                />
                <span style={{ fontSize: 11, color: '#6b7280', flexShrink: 0 }}>
                  {a.blok_sayisi} blok • {a.toplam_daire} daire • {a.toplam_kat} kat
                </span>
                <span style={{ flex: 1 }} />
                <button
                  onClick={() => setAcik(acikMi ? null : adaIdx)}
                  style={{
                    background: 'none',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: 11,
                    color: '#6b7280',
                    cursor: 'pointer',
                  }}
                >
                  {acikMi ? '▾ Kapat' : '▸ Bloklar'}
                </button>
                <button
                  onClick={() => {
                    if (!window.confirm(`'${a.ada}' adası ve blokları silinsin mi?`)) return;
                    onChange(adalar.filter((_, i) => i !== adaIdx));
                    if (acik === adaIdx) setAcik(null);
                  }}
                  style={{
                    background: 'none',
                    border: '1px solid #fecaca',
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: 11,
                    color: '#ef4444',
                    cursor: 'pointer',
                  }}
                >
                  Sil
                </button>
              </div>

              {acikMi && (
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Blok Sayısı (yeniden üret)</label>
                      <input
                        type="number"
                        min={1}
                        style={inputStyle}
                        value={a.blok_sayisi}
                        onChange={(e) => {
                          const n = parseInt(e.target.value) || 0;
                          adaGuncelle(adaIdx, (x) => ({ ...x, blok_sayisi: n }));
                        }}
                      />
                    </div>
                    <button
                      onClick={() => adaGuncelle(adaIdx, (x) => adaBloklariniYenidenUret(x))}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#374151',
                        cursor: 'pointer',
                      }}
                    >
                      Blokları Yeniden Üret
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {a.bloklar.map((b, blokIdx) => (
                      <div
                        key={blokIdx}
                        style={{
                          display: 'flex',
                          gap: 6,
                          alignItems: 'center',
                          backgroundColor: '#fff',
                          borderRadius: 8,
                          padding: 6,
                          border: '1px solid #f0f0f0',
                        }}
                      >
                        <span
                          style={{
                            width: 26,
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#f59e0b',
                            flexShrink: 0,
                            textAlign: 'center',
                          }}
                        >
                          {b.blok_no}
                        </span>
                        <input
                          style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                          value={b.tip}
                          placeholder="Tip"
                          onChange={(e) => blokGuncelle(adaIdx, blokIdx, (x) => ({ ...x, tip: e.target.value }))}
                        />
                        <input
                          type="number"
                          min={0}
                          style={{ ...inputStyle, width: 70, flexShrink: 0 }}
                          value={b.daire_sayisi}
                          title="Daire"
                          onChange={(e) => blokGuncelle(adaIdx, blokIdx, (x) => ({ ...x, daire_sayisi: parseInt(e.target.value) || 0 }))}
                        />
                        <input
                          type="number"
                          min={0}
                          style={{ ...inputStyle, width: 60, flexShrink: 0 }}
                          value={b.kat_sayisi}
                          title="Kat"
                          onChange={(e) => blokGuncelle(adaIdx, blokIdx, (x) => ({ ...x, kat_sayisi: parseInt(e.target.value) || 0 }))}
                        />
                        <input
                          style={{ ...inputStyle, width: 90, flexShrink: 0 }}
                          value={b.yapi_konfigurasyonu}
                          placeholder="Konfig"
                          onChange={(e) => blokGuncelle(adaIdx, blokIdx, (x) => ({ ...x, yapi_konfigurasyonu: e.target.value }))}
                        />
                        <button
                          onClick={() =>
                            adaGuncelle(adaIdx, (x) => ({
                              ...x,
                              bloklar: x.bloklar.filter((_, i) => i !== blokIdx),
                            }))
                          }
                          style={{
                            background: 'none',
                            border: '1px solid #fecaca',
                            borderRadius: 6,
                            padding: '2px 8px',
                            fontSize: 11,
                            color: '#ef4444',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        adaGuncelle(adaIdx, (x) => ({
                          ...x,
                          bloklar: [...x.bloklar, bosBlok(x.bloklar.length + 1, x.bloklar[0])],
                        }))
                      }
                      style={{
                        padding: '6px',
                        backgroundColor: '#fff',
                        border: '1px dashed #d1d5db',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#9ca3af',
                        cursor: 'pointer',
                      }}
                    >
                      + Blok Ekle
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
