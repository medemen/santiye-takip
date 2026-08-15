import type { IsDurumu } from '../../types';
import { DURUM_LABELLARI } from '../../config/defaultConfig';
import type { ImalatGrubu } from '../../config/types';
import SectionTitle from './SectionTitle';

export interface KalemOneri {
  durum: IsDurumu;
  ilerleme: number;
}

interface Props {
  gruplar: ImalatGrubu[];
  secili: string;
  arama: string;
  onAramaDegis: (v: string) => void;
  onSelect: (kalem: string) => void;
  oneri?: KalemOneri | null;
}

export default function IsKalemiSecimi({
  gruplar,
  secili,
  arama,
  onAramaDegis,
  onSelect,
  oneri,
}: Props) {
  return (
    <div>
      <SectionTitle>İş Kalemi</SectionTitle>
      <input
        type="text"
        placeholder="İş kalemi ara..."
        value={arama}
        onChange={(e) => onAramaDegis(e.target.value)}
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
                    onClick={() => onSelect(ik)}
                    style={{
                      padding: '10px 8px',
                      backgroundColor: secili === ik ? '#f59e0b' : '#f9fafb',
                      border: '1px solid',
                      borderColor: secili === ik ? '#f59e0b' : '#e5e7eb',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 500,
                      color: secili === ik ? '#fff' : '#374151',
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

      {oneri && (
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
          Bu ada + iş kalemi için son rapor: {DURUM_LABELLARI[oneri.durum]} (
          %{oneri.ilerleme}) — değerler otomatik dolduruldu, değiştirebilirsiniz.
        </div>
      )}
    </div>
  );
}
