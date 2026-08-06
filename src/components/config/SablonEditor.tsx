import type { ImalatGrubu, Sablon } from '../../config/types';
import type { IsDurumu } from '../../types';
import { DURUM_LABELLARI } from '../../config/defaultConfig';

interface Props {
  sablonlar: Sablon[];
  gruplar: ImalatGrubu[];
  onChange: (sablonlar: Sablon[]) => void;
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

export default function SablonEditor({ sablonlar, gruplar, onChange }: Props) {
  const guncelle = (id: string, kismi: Partial<Sablon>) => {
    onChange(sablonlar.map((s) => (s.id === id ? { ...s, ...kismi } : s)));
  };

  const yeniSablon = () => {
    const sayi = sablonlar.length + 1;
    const ilkGrup = gruplar[0]?.id ?? '';
    onChange([
      ...sablonlar,
      {
        id: `sablon-${Date.now().toString(36)}`,
        ad: `Yeni Şablon ${sayi}`,
        aciklama: '',
        grup_idleri: ilkGrup ? [ilkGrup] : [],
        varsayilan_durum: 'devam_ediyor',
        varsayilan_ilerleme: 50,
        varsayilan_aciklama: '',
      },
    ]);
  };

  const grupAdi = (id: string) => gruplar.find((g) => g.id === id)?.ad ?? id;

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
          Yeni Şablon
        </div>
        <button
          onClick={yeniSablon}
          style={{
            padding: '10px',
            backgroundColor: '#f59e0b',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#fff',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          + Şablon Ekle
        </button>
      </div>

      {sablonlar.length === 0 && (
        <div style={{ fontSize: 12, color: '#9ca3af', padding: '12px 0' }}>
          Henüz şablon tanımlanmadı.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sablonlar.map((s) => (
          <div key={s.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                value={s.ad}
                onChange={(e) => guncelle(s.id, { ad: e.target.value })}
                placeholder="Şablon adı"
              />
              <button
                onClick={() => {
                  if (!window.confirm(`'${s.ad}' şablonu silinsin mi?`)) return;
                  onChange(sablonlar.filter((x) => x.id !== s.id));
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

            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 8 }}>
              id: {s.id} • {s.grup_idleri.map(grupAdi).join(', ') || 'grup seçilmedi'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={labelStyle}>Açıklama (buton başlığı)</label>
                <input
                  style={inputStyle}
                  value={s.aciklama}
                  onChange={(e) => guncelle(s.id, { aciklama: e.target.value })}
                  placeholder="Şablon açıklaması"
                />
              </div>

              <div>
                <label style={labelStyle}>Gruplar (şablona dahil iş kalemleri)</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {gruplar.map((g) => {
                    const secili = s.grup_idleri.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => {
                          const yeniIdler = secili
                            ? s.grup_idleri.filter((x) => x !== g.id)
                            : [...s.grup_idleri, g.id];
                          guncelle(s.id, { grup_idleri: yeniIdler });
                        }}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: secili ? '#f59e0b' : '#f3f4f6',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 600,
                          color: secili ? '#fff' : '#4b5563',
                          cursor: 'pointer',
                        }}
                      >
                        {g.ad} ({g.kalemler.length})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={labelStyle}>Varsayılan Durum</label>
                  <select
                    style={inputStyle}
                    value={s.varsayilan_durum}
                    onChange={(e) => guncelle(s.id, { varsayilan_durum: e.target.value as IsDurumu })}
                  >
                    {(Object.entries(DURUM_LABELLARI) as [IsDurumu, string][]).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={labelStyle}>
                    Varsayılan İlerleme: %{s.varsayilan_ilerleme ?? 50}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={s.varsayilan_ilerleme ?? 50}
                    onChange={(e) => guncelle(s.id, { varsayilan_ilerleme: parseInt(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Varsayılan Açıklama (raporda hazır doldurulur)</label>
                <textarea
                  rows={2}
                  style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
                  value={s.varsayilan_aciklama ?? ''}
                  onChange={(e) => guncelle(s.id, { varsayilan_aciklama: e.target.value })}
                  placeholder="örn. Bu blokta kalıp ve demir işleri tamamlandı."
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
