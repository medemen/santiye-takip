import { useEffect, useState } from 'react';
import type { ImalatGrubu } from '../../config/types';
import { benzersizId } from '../../config/editor';
import { onayla } from '../../utils/dialog';

interface Props {
  gruplar: ImalatGrubu[];
  onChange: (gruplar: ImalatGrubu[]) => void;
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

export default function KalemGrupEditor({ gruplar, onChange }: Props) {
  const [yeniGrupAdi, setYeniGrupAdi] = useState('');
  const [yeniKaynak, setYeniKaynak] = useState<'pdf' | 'yeni'>('yeni');

  const [metinler, setMetinler] = useState<Record<string, string>>(() =>
    Object.fromEntries(gruplar.map((g) => [g.id, g.kalemler.join('\n')]))
  );
  const gidAnahtari = gruplar.map((g) => g.id).join('|');
  useEffect(() => {
    setMetinler(Object.fromEntries(gruplar.map((g) => [g.id, g.kalemler.join('\n')])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gidAnahtari]);

  const ekleGrup = () => {
    const ad = yeniGrupAdi.trim();
    if (!ad) return;
    const id = benzersizId(ad, gruplar.map((g) => g.id));
    onChange([...gruplar, { id, ad, kaynak: yeniKaynak, kalemler: [] }]);
    setYeniGrupAdi('');
  };

  const kalemleriGuncelle = (gid: string, metin: string) => {
    setMetinler((m) => ({ ...m, [gid]: metin }));
    onChange(
      gruplar.map((g) =>
        g.id === gid
          ? { ...g, kalemler: metin.split('\n').map((k) => k.trim()).filter(Boolean) }
          : g
      )
    );
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
          Yeni İş Kalemi Grubu
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <label style={labelStyle}>Grup Adı</label>
            <input
              style={inputStyle}
              value={yeniGrupAdi}
              placeholder="örn. KABA İŞLER"
              onChange={(e) => setYeniGrupAdi(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Kaynak</label>
            <select
              style={inputStyle}
              value={yeniKaynak}
              onChange={(e) => setYeniKaynak(e.target.value as 'pdf' | 'yeni')}
            >
              <option value="yeni">Yeni</option>
              <option value="pdf">PDF (Durum Tespit)</option>
            </select>
          </div>
          <button
            onClick={ekleGrup}
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
            + Grup Ekle
          </button>
        </div>
      </div>

      {gruplar.length === 0 && (
        <div style={{ fontSize: 12, color: '#9ca3af', padding: '12px 0' }}>
          Henüz iş kalemi grubu tanımlanmadı.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {gruplar.map((g) => (
          <div key={g.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                value={g.ad}
                onChange={(e) =>
                  onChange(gruplar.map((x) => (x.id === g.id ? { ...x, ad: e.target.value } : x)))
                }
              />
              <select
                style={{ ...inputStyle, width: 140, flexShrink: 0 }}
                value={g.kaynak}
                onChange={(e) =>
                  onChange(
                    gruplar.map((x) =>
                      x.id === g.id ? { ...x, kaynak: e.target.value as 'pdf' | 'yeni' } : x
                    )
                  )
                }
              >
                <option value="yeni">Yeni</option>
                <option value="pdf">PDF</option>
              </select>
              <button
                onClick={async () => {
                  if (!(await onayla(`'${g.ad}' grubu silinsin mi?`))) return;
                  onChange(gruplar.filter((x) => x.id !== g.id));
                }}
                style={{
                  background: 'none',
                  border: '1px solid #fecaca',
                  borderRadius: 6,
                  padding: '2px 10px',
                  fontSize: 11,
                  color: '#ef4444',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Sil
              </button>
            </div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>
              id: {g.id} • {g.kalemler.length} kalem
            </div>
            <textarea
              rows={5}
              style={{
                ...inputStyle,
                fontFamily: 'inherit',
                lineHeight: 1.6,
                resize: 'vertical',
              }}
              placeholder={'Her satıra bir iş kalemi yazın\nörn.\nHafriyat\nBetonarme Kalıp'}
              value={metinler[g.id] ?? ''}
              onChange={(e) => kalemleriGuncelle(g.id, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
