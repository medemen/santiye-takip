import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../stores/authStore';
import { setSiteConfig, persistConfigToDb } from '../config/site';
import { DEFAULT_CONFIG } from '../config/defaultConfig';
import {
  bosSantiyeConfig,
  configValidate,
  durumTespitUret,
  sablonlariUret,
} from '../config/editor';
import { getAllKalemler } from '../config/helpers';
import type { SantiyeConfig } from '../config/types';
import { toastGoster } from '../stores/toastStore';
import { card, pageTitle } from '../utils/styles';
import AdaBlokEditor from '../components/config/AdaBlokEditor';
import KalemGrupEditor from '../components/config/KalemGrupEditor';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  fontSize: 13,
  boxSizing: 'border-box',
  backgroundColor: '#fff',
  color: '#1f2937',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: '#4b5563',
  marginBottom: 4,
};

const adimBasliklari = [
  'Şantiye Şablonu',
  'Genel Bilgiler',
  'Adalar & Bloklar',
  'İş Kalemleri',
  'Roller',
  'Özet & Yayınla',
];

export default function NewSantiyeWizard() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [adim, setAdim] = useState(0);
  const [sablonMu, setSablonMu] = useState(true);
  const [draft, setDraft] = useState<SantiyeConfig | null>(null);
  const [adimNotu, setAdimNotu] = useState('');
  const [yayinlaniyor, setYayinlaniyor] = useState(false);

  if (!user?.admin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
        Bu sayfaya yalnızca yöneticiler erişebilir.
      </div>
    );
  }

  const draftiGuncelle = (f: (d: SantiyeConfig) => SantiyeConfig) => {
    if (draft) setDraft(f(draft));
  };

  const basla = (sablon: boolean) => {
    setSablonMu(sablon);
    setDraft(
      sablon ? JSON.parse(JSON.stringify(DEFAULT_CONFIG)) : bosSantiyeConfig()
    );
    setAdim(1);
    setAdimNotu('');
  };

  const ileri = () => {
    if (!draft) return;
    if (adim === 1 && !draft.genel.santiyeAdi.trim()) {
      setAdimNotu('Şantiye adı zorunludur.');
      return;
    }
    if (adim === 2 && draft.yapi.adalar.length === 0) {
      setAdimNotu('En az bir ada tanımlayın.');
      return;
    }
    if (adim === 3 && draft.isKalemleri.gruplar.length === 0) {
      setAdimNotu('En az bir iş kalemi grubu tanımlayın.');
      return;
    }
    setAdimNotu('');
    setAdim((a) => Math.min(a + 1, adimBasliklari.length - 1));
  };

  const geri = () => {
    setAdimNotu('');
    setAdim((a) => Math.max(a - 1, 0));
  };

  const yayinla = async () => {
    if (!draft) return;
    const sonDurum: SantiyeConfig = {
      ...draft,
      durumTespit: durumTespitUret(draft),
    };
    const grupIdler = sonDurum.isKalemleri.gruplar.map((g) => g.id);
    sonDurum.isKalemleri.sablonlar = sablonMu
      ? sonDurum.isKalemleri.sablonlar
          .map((s) => ({ ...s, grup_idleri: s.grup_idleri.filter((id) => grupIdler.includes(id)) }))
          .filter((s) => s.grup_idleri.length > 0)
      : sablonlariUret(sonDurum.isKalemleri.gruplar);

    const sorunlar = configValidate(sonDurum);
    if (sorunlar.length > 0) {
      setAdimNotu('Doğrulama hatalarını gidermek için özet adımındaki listeyi inceleyin.');
      return;
    }

    setYayinlaniyor(true);
    try {
      setSiteConfig(sonDurum, { persistLocal: true });
      await persistConfigToDb(sonDurum);
      toastGoster('Yeni şantiye yapısı yayınlandı', 'success');
      navigate('/');
    } catch (err) {
      const mesaj = err instanceof Error ? err.message : 'Bilinmeyen hata';
      toastGoster('Yayınlanamadı: ' + mesaj, 'error');
    } finally {
      setYayinlaniyor(false);
    }
  };

  const renderIcerik = () => {
    if (!draft) {
      return (
        <div>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            Yeni bir şantiye yapısı kurmak için bir başlangıç seçin. Kurulum sonunda yapı
            sunucuya yayınlanır ve tüm cihazlar bu yapıyı kullanmaya başlar.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => basla(true)}
              style={{
                textAlign: 'left',
                padding: 16,
                backgroundColor: '#fff',
                border: '2px solid #f59e0b',
                borderRadius: 14,
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>
                Güneyşehir Şablonuyla Başla
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                Hazır ada/blok (6 ada, 136 blok) ve iş kalemi (19 grup, 200+ kalem) yapısıyla
                gelir; dilediğiniz gibi düzenlersiniz.
              </div>
            </button>
            <button
              onClick={() => basla(false)}
              style={{
                textAlign: 'left',
                padding: 16,
                backgroundColor: '#fff',
                border: '2px solid #e5e7eb',
                borderRadius: 14,
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>
                Boştan Başla
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                Ada ve iş kalemi yapısını sıfırdan tanımlayın.
              </div>
            </button>
          </div>
        </div>
      );
    }

    if (adim === 1) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={labelStyle}>Şantiye Adı *</label>
            <input
              style={inputStyle}
              value={draft.genel.santiyeAdi}
              onChange={(e) => draftiGuncelle((d) => ({ ...d, genel: { ...d.genel, santiyeAdi: e.target.value } }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Proje Adı</label>
            <input
              style={inputStyle}
              value={draft.genel.projeAdi}
              onChange={(e) => draftiGuncelle((d) => ({ ...d, genel: { ...d.genel, projeAdi: e.target.value } }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Müşteri</label>
            <input
              style={inputStyle}
              value={draft.genel.musteri}
              onChange={(e) => draftiGuncelle((d) => ({ ...d, genel: { ...d.genel, musteri: e.target.value } }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Başlangıç Tarihi</label>
            <input
              type="date"
              style={inputStyle}
              value={draft.genel.baslangicTarihi ?? ''}
              onChange={(e) =>
                draftiGuncelle((d) => ({ ...d, genel: { ...d.genel, baslangicTarihi: e.target.value || undefined } }))
              }
            />
          </div>
          <div>
            <label style={labelStyle}>Uygulama Adı</label>
            <input
              style={inputStyle}
              value={draft.marka.appName}
              onChange={(e) => draftiGuncelle((d) => ({ ...d, marka: { ...d.marka, appName: e.target.value } }))}
            />
          </div>
          <div>
            <label style={labelStyle}>E-posta Alanı (şifre girişleri)</label>
            <input
              style={inputStyle}
              value={draft.marka.emailDomain}
              onChange={(e) => draftiGuncelle((d) => ({ ...d, marka: { ...d.marka, emailDomain: e.target.value } }))}
            />
          </div>
        </div>
      );
    }

    if (adim === 2) {
      return (
        <AdaBlokEditor
          adalar={draft.yapi.adalar}
          onChange={(adalar) => draftiGuncelle((d) => ({ ...d, yapi: { adalar } }))}
        />
      );
    }

    if (adim === 3) {
      return (
        <KalemGrupEditor
          gruplar={draft.isKalemleri.gruplar}
          onChange={(gruplar) =>
            draftiGuncelle((d) => ({ ...d, isKalemleri: { ...d.isKalemleri, gruplar } }))
          }
        />
      );
    }

    if (adim === 4) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={labelStyle}>
              Saha Personeli Rolleri{' '}
              <span style={{ fontWeight: 400, color: '#9ca3af' }}>(virgülle ayırın)</span>
            </label>
            <input
              style={inputStyle}
              value={draft.roller.sahaPersoneliRolleri.join(', ')}
              onChange={(e) =>
                draftiGuncelle((d) => ({
                  ...d,
                  roller: {
                    ...d.roller,
                    sahaPersoneliRolleri: e.target.value.split(',').map((r) => r.trim()).filter(Boolean),
                  },
                }))
              }
            />
          </div>
          <div>
            <label style={labelStyle}>
              Seçilebilir Roller{' '}
              <span style={{ fontWeight: 400, color: '#9ca3af' }}>(virgülle ayırın)</span>
            </label>
            <input
              style={inputStyle}
              value={draft.roller.secilebilirRoller.join(', ')}
              onChange={(e) =>
                draftiGuncelle((d) => ({
                  ...d,
                  roller: {
                    ...d.roller,
                    secilebilirRoller: e.target.value.split(',').map((r) => r.trim()).filter(Boolean),
                  },
                }))
              }
            />
          </div>
        </div>
      );
    }

    const sorunlar = configValidate({
      ...draft,
      durumTespit: durumTespitUret(draft),
    });

    return (
      <div>
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
            border: '1px solid #f0f0f0',
            fontSize: 13,
            color: '#374151',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div>
            <strong>{draft.genel.santiyeAdi || '(Adı yok)'}</strong>
            {draft.genel.projeAdi && <span style={{ color: '#6b7280' }}> — {draft.genel.projeAdi}</span>}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {draft.yapi.adalar.length} ada •{' '}
            {draft.yapi.adalar.reduce((s, a) => s + a.blok_sayisi, 0)} blok •{' '}
            {draft.yapi.adalar.reduce((s, a) => s + a.toplam_daire, 0)} daire
          </div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {draft.isKalemleri.gruplar.length} iş kalemi grubu •{' '}
            {getAllKalemler(draft).length} kalem •{' '}
            {draft.isKalemleri.sablonlar.length} şablon
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#fef3c7',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 12,
            fontSize: 12,
            color: '#92400e',
            border: '1px solid #fde68a',
          }}
        >
          ⚠️ Yayınlama, mevcut şantiye yapısını bu kurulumla değiştirir. Mevcut raporlar ve
          hedefler, ada/iş kalemi adlarıyla eşleşmeyebilir. Yeni bir şantiyede temiz bir
          veritabanıyla kullanmanız önerilir.
        </div>

        {sorunlar.length > 0 && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 12,
              border: '1px solid #fecaca',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', marginBottom: 4 }}>
              Doğrulama hataları ({sorunlar.length}):
            </div>
            {sorunlar.map((s, i) => (
              <div key={i} style={{ fontSize: 12, color: '#b91c1c' }}>
                • {s}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={yayinla}
          disabled={yayinlaniyor || sorunlar.length > 0}
          style={{
            width: '100%',
            padding: 14,
            backgroundColor: sorunlar.length === 0 && !yayinlaniyor ? '#f59e0b' : '#e5e7eb',
            border: 'none',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            color: sorunlar.length === 0 && !yayinlaniyor ? '#fff' : '#9ca3af',
            cursor: sorunlar.length === 0 && !yayinlaniyor ? 'pointer' : 'not-allowed',
          }}
        >
          {yayinlaniyor ? 'Yayınlanıyor…' : 'Yapıyı Yayınla ve Başlat'}
        </button>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={pageTitle}>Yeni Şantiye Kurulumu</h1>
        <button
          onClick={() => navigate('/ayarlar')}
          style={{
            background: 'none',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            color: '#6b7280',
            cursor: 'pointer',
          }}
        >
          İptal
        </button>
      </div>

      {draft && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {adimBasliklari.map((b, i) => (
            <span
              key={b}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 12,
                backgroundColor: i === adim ? '#f59e0b' : i < adim ? '#fef3c7' : '#f3f4f6',
                color: i === adim ? '#fff' : i < adim ? '#92400e' : '#9ca3af',
              }}
            >
              {i + 1}. {b}
            </span>
          ))}
        </div>
      )}

      <div style={{ ...card, padding: 16 }}>{renderIcerik()}</div>

      {draft && adim > 0 && (
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            onClick={geri}
            style={{
              flex: 1,
              padding: 12,
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
          {adim < adimBasliklari.length - 1 && (
            <button
              onClick={ileri}
              style={{
                flex: 1,
                padding: 12,
                backgroundColor: '#f59e0b',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              İleri →
            </button>
          )}
        </div>
      )}

      {adimNotu && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#ef4444', textAlign: 'center' }}>
          {adimNotu}
        </div>
      )}
    </div>
  );
}
