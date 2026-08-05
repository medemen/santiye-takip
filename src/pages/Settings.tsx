import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../stores/authStore';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { setSiteConfig, resetSiteConfig, persistConfigToDb } from '../config/site';
import { CONFIG_VERSION } from '../config/defaultConfig';
import { getAllKalemler } from '../config/helpers';
import { toastGoster } from '../stores/toastStore';
import { card, pageTitle, btnGhost } from '../utils/styles';

export default function Settings() {
  const navigate = useNavigate();
  const config = useSiteConfig();
  const user = getCurrentUser();

  const [santiyeAdi, setSantiyeAdi] = useState(config.genel.santiyeAdi);
  const [projeAdi, setProjeAdi] = useState(config.genel.projeAdi);
  const [musteri, setMusteri] = useState(config.genel.musteri);
  const [baslangicTarihi, setBaslangicTarihi] = useState(config.genel.baslangicTarihi ?? '');
  const [appName, setAppName] = useState(config.marka.appName);
  const [webBasename, setWebBasename] = useState(config.marka.webBasename);
  const [emailDomain, setEmailDomain] = useState(config.marka.emailDomain);
  const [sahaRolleri, setSahaRolleri] = useState(config.roller.sahaPersoneliRolleri.join(', '));
  const [kaydediliyor, setKaydediliyor] = useState(false);

  if (!user?.admin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
        Bu sayfaya yalnızca yöneticiler erişebilir.
      </div>
    );
  }

  const handleKaydet = async () => {
    setKaydediliyor(true);
    try {
      const yeni = {
        ...config,
        genel: {
          ...config.genel,
          santiyeAdi: santiyeAdi.trim(),
          projeAdi: projeAdi.trim(),
          musteri: musteri.trim(),
          baslangicTarihi: baslangicTarihi || undefined,
        },
        marka: {
          ...config.marka,
          appName: appName.trim(),
          webBasename: webBasename.trim() || '/',
          emailDomain: emailDomain.trim(),
        },
        roller: {
          ...config.roller,
          sahaPersoneliRolleri: sahaRolleri
            .split(',')
            .map((r) => r.trim())
            .filter(Boolean),
        },
      };
      setSiteConfig(yeni, { persistLocal: true });
      toastGoster('Ayarlar cihazınıza kaydedildi', 'success');
      try {
        await persistConfigToDb(yeni);
        toastGoster('Ayarlar sunucuya yayınlandı', 'success');
      } catch (err) {
        const mesaj = err instanceof Error ? err.message : 'Bilinmeyen hata';
        toastGoster('Sunucuya kaydedilemedi (çevrimdışıysanız normal): ' + mesaj, 'error');
      }
    } finally {
      setKaydediliyor(false);
    }
  };

  const handleSifirla = async () => {
    if (!window.confirm('Tüm ayarlar varsayılana döndürülecek. Emin misiniz?')) return;
    resetSiteConfig({ persistDb: true });
    toastGoster('Ayarlar varsayılana döndürüldü', 'success');
    navigate('/');
  };

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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={pageTitle}>Şantiye Ayarları</h1>
        <button onClick={() => navigate('/')} style={btnGhost}>
          ← Dashboard
        </button>
      </div>

      <div style={{ ...card, padding: 14, marginBottom: 16, fontSize: 12, color: '#6b7280' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span>Konfigürasyon v{CONFIG_VERSION}</span>
          <span>{config.yapi.adalar.length} ada • {getAllKalemler(config).length} iş kalemi • {config.durumTespit.satirlar.length} durum tespit satırı</span>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0, marginBottom: 12 }}>
          Genel Bilgiler
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={labelStyle}>Şantiye Adı</label>
            <input style={inputStyle} value={santiyeAdi} onChange={(e) => setSantiyeAdi(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Proje Adı</label>
            <input style={inputStyle} value={projeAdi} onChange={(e) => setProjeAdi(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Müşteri</label>
            <input style={inputStyle} value={musteri} onChange={(e) => setMusteri(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Başlangıç Tarihi</label>
            <input type="date" style={inputStyle} value={baslangicTarihi} onChange={(e) => setBaslangicTarihi(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0, marginBottom: 12 }}>
          Uygulama Markası
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={labelStyle}>Uygulama Adı (kapak/bildirim)</label>
            <input style={inputStyle} value={appName} onChange={(e) => setAppName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Web Yol (basename)</label>
            <input style={inputStyle} value={webBasename} onChange={(e) => setWebBasename(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>E-posta Alanı (şifre girişleri)</label>
            <input style={inputStyle} value={emailDomain} onChange={(e) => setEmailDomain(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0, marginBottom: 12 }}>
          Roller
        </h3>
        <div>
          <label style={labelStyle}>
            Saha Personeli Rolleri <span style={{ fontWeight: 400, color: '#9ca3af' }}>(virgülle ayırın)</span>
          </label>
          <input style={inputStyle} value={sahaRolleri} onChange={(e) => setSahaRolleri(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleKaydet}
          disabled={kaydediliyor}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: '#f59e0b',
            border: 'none',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            color: '#fff',
            cursor: kaydediliyor ? 'not-allowed' : 'pointer',
            opacity: kaydediliyor ? 0.6 : 1,
          }}
        >
          {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet ve Yayınla'}
        </button>
        <button
          onClick={handleSifirla}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: '#fef2f2',
            border: 'none',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            color: '#ef4444',
            cursor: 'pointer',
          }}
        >
          Varsayılana Döndür
        </button>
      </div>
    </div>
  );
}
