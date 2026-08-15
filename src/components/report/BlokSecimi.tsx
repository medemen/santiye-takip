import type { IsDurumu } from '../../types';
import { DURUM_LABELLARI, DURUM_RENKLERI } from '../../config/defaultConfig';
import SectionTitle from './SectionTitle';

export interface BlokBilgi {
  durum: IsDurumu;
  ilerleme_yuzde: number;
  adaGenel: boolean;
}

interface Props {
  bloklar: number[];
  yetkiliBloklar: number[];
  seciliBloklar: number[];
  blokDurumMap: Record<number, BlokBilgi>;
  adaGeneli: boolean;
  onToggleAdaGeneli: () => void;
  onToggleBlok: (blokNo: number) => void;
  onTumunuSec: () => void;
  onTemizle: () => void;
}

export default function BlokSecimi({
  bloklar,
  yetkiliBloklar,
  seciliBloklar,
  blokDurumMap,
  adaGeneli,
  onToggleAdaGeneli,
  onToggleBlok,
  onTumunuSec,
  onTemizle,
}: Props) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <SectionTitle>Bloklar</SectionTitle>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onToggleAdaGeneli}
            style={{
              background: adaGeneli ? 'var(--bg-accent)' : 'none',
              border: adaGeneli ? '1px solid #f59e0b' : '1px solid #e5e7eb',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 11,
              color: adaGeneli ? 'var(--accent-dark)' : 'var(--text-faint)',
              cursor: 'pointer',
            }}
            title="Raporu ada geneli (tüm bloklar) olarak kaydet"
          >
            {adaGeneli ? '✓ ' : ''}Ada Geneli
          </button>
          {!adaGeneli && (
            <>
              <button onClick={onTumunuSec} style={kucukButon}>Tümünü Seç</button>
              <button onClick={onTemizle} style={kucukButon}>Temizle</button>
            </>
          )}
        </div>
      </div>

      {adaGeneli ? (
        <div style={{ padding: 14, backgroundColor: 'var(--bg-accent)', borderRadius: 10, fontSize: 12, color: 'var(--accent-dark)' }}>
          Bu iş kalemi için tek bir <strong>ada geneli rapor</strong> kaydedilecek. Tüm bloklar bu veriyi devralır.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 8 }}>
            {yetkiliBloklar.length === 0
              ? 'Bu ada için yetkiniz bulunan blok yok.'
              : `${seciliBloklar.length}/${yetkiliBloklar.length} blok seçili. Renkli bloklar mevcut raporu gösterir.`}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))', gap: 6 }}>
            {bloklar.map((b) => {
              const bilgi = blokDurumMap[b];
              const isSelected = seciliBloklar.includes(b);
              let bgColor = 'var(--bg-subtle)';
              let textColor = 'var(--text-muted)';
              if (bilgi) {
                bgColor = DURUM_RENKLERI[bilgi.durum];
                textColor = '#fff';
              } else if (isSelected) {
                bgColor = '#f59e0b';
                textColor = '#fff';
              }
              const tooltip = bilgi
                ? `${DURUM_LABELLARI[bilgi.durum]} (%${bilgi.ilerleme_yuzde})${bilgi.adaGenel ? ' — Ada Geneli' : ''}`
                : 'Henüz rapor girilmemiş';
              return (
                <button
                  key={b}
                  onClick={() => onToggleBlok(b)}
                  title={tooltip}
                  style={{
                    padding: 8,
                    backgroundColor: bgColor,
                    border: bilgi?.adaGenel
                      ? '2px dashed #fff'
                      : isSelected
                        ? '2px solid #fff'
                        : 'none',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    color: textColor,
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 0 0 2px #f59e0b' : 'none',
                  }}
                >
                  {b}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const kucukButon = {
  background: 'none',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  padding: '2px 8px',
  fontSize: 11,
  color: 'var(--text-faint)',
  cursor: 'pointer',
} as const;
