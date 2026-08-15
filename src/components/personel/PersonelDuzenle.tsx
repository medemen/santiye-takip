import type { AdaBlok } from '../../config/types';
import type { Personel, BlokAtamasi } from '../../types';
import type { Kullanici } from '../../stores/kullanicilarStore';
import { KullaniciYetkiKarti } from '../KullaniciYonetim';
import { ROL_RENKLERI, ROL_YAZI_RENKLERI } from './rolRenkleri';

interface Props {
  editPerson: string;
  person: Personel | undefined;
  kullanici: Kullanici | undefined;
  editAda: string;
  editBlokAtama: BlokAtamasi;
  adalar: AdaBlok[];
  yetkiliAdalar: string[];
  isPm: boolean;
  onAdaChange: (ada: string) => void;
  onBlokToggle: (ada: string, blokNo: number) => void;
  onAdaToggle: (ada: string, bloklar: { blok_no: number }[]) => void;
  onKaydet: () => void;
  onIptal: () => void;
}

export default function PersonelDuzenle({
  editPerson,
  person,
  kullanici,
  editAda,
  editBlokAtama,
  adalar,
  yetkiliAdalar,
  isPm,
  onAdaChange,
  onBlokToggle,
  onAdaToggle,
  onKaydet,
  onIptal,
}: Props) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: 0 }}>
          Personel Düzenle
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onIptal}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: '#4b5563',
              cursor: 'pointer',
            }}
          >
            İptal
          </button>
          <button onClick={onKaydet}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f59e0b',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Kaydet
          </button>
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
          border: '1px solid #f0f0f0',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1f2937' }}>{editPerson}</div>
        {person && (
          <span
            style={{
              display: 'inline-block',
              fontSize: 11,
              padding: '1px 8px',
              borderRadius: 8,
              backgroundColor: ROL_RENKLERI[person.rol] || '#f3f4f6',
              color: ROL_YAZI_RENKLERI[person.rol] || '#4b5563',
              marginTop: 4,
            }}
          >
            {person.rol}
          </span>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#4b5563', marginBottom: 6 }}>
          Atanacağı Ada
        </label>
        <select
          value={editAda}
          onChange={(e) => onAdaChange(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 12,
            border: '2px solid #e5e7eb',
            fontSize: 14,
            backgroundColor: '#fff',
            boxSizing: 'border-box',
          }}
        >
          <option value="">Atanmamış</option>
          {(yetkiliAdalar.length > 0 ? yetkiliAdalar : adalar.map((a) => a.ada)).map((ada) => (
            <option key={ada} value={ada}>{ada}</option>
          ))}
        </select>
      </div>

      {editAda && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>
              Blok Atamaları ({editAda})
            </h3>
            <button
              onClick={() => {
                const adaBlok = adalar.find((a) => a.ada === editAda);
                if (adaBlok) onAdaToggle(editAda, adaBlok.bloklar);
              }}
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
              Tümünü Seç/Temizle
            </button>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))',
              gap: 6,
            }}
          >
            {adalar.find((a) => a.ada === editAda)?.bloklar.map((b) => {
              const secili = editBlokAtama[editAda] || [];
              const active = secili.includes(b.blok_no);
              return (
                <button
                  key={b.blok_no}
                  onClick={() => onBlokToggle(editAda, b.blok_no)}
                  style={{
                    padding: 8,
                    backgroundColor: active ? '#f59e0b' : '#f3f4f6',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    color: active ? '#fff' : '#4b5563',
                    cursor: 'pointer',
                  }}
                >
                  {b.blok_no}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
            Hiç blok seçilmezse tüm bloklara erişebilir
          </p>
        </div>
      )}

      {kullanici && isPm && (
        <div style={{ marginTop: 20 }}>
          <KullaniciYetkiKarti kullanici={kullanici} />
        </div>
      )}
    </div>
  );
}
