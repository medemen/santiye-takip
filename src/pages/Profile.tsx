import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, cikisYap } from '../stores/authStore';
import { getKullaniciAdaAtamasi, getKullaniciBloklari } from '../stores/atamaStore';
import { getPersonelRaporlari } from '../stores/reportStore';
import { getAllPersonel, isSantiyeSefi, getSefAdalar } from '../stores/kullanicilarStore';
import {
  nativeBildirimVarMi,
  bildirimIzniDurumu,
  bildirimIzniIste,
  bildirimAyarlariGetir,
  bildirimAyarlariKaydet,
  gunlukOzetPlanla,
  gunlukOzetIptal,
  testBildirimGonder,
  hedefUyarilariniGoster,
} from '../stores/notificationStore';
import { toastGoster } from '../stores/toastStore';
import { onayla } from '../utils/dialog';

export default function Profile() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [izinDurumu, setIzinDurumu] = useState<'granted' | 'denied' | 'prompt' | 'unsupported'>('prompt');
  const [ayarlar, setAyarlar] = useState(() => bildirimAyarlariGetir());

  useEffect(() => {
    bildirimIzniDurumu().then(setIzinDurumu);
  }, []);

  if (!user) return null;

  const ayarlariGuncelle = (yeni: typeof ayarlar) => {
    setAyarlar(yeni);
    bildirimAyarlariKaydet(yeni);
    if (nativeBildirimVarMi()) {
      if (yeni.gunlukOzet) gunlukOzetPlanla();
      else gunlukOzetIptal();
    }
  };

  const atananAda = getKullaniciAdaAtamasi(user.ad_soyad);
  const kisi = getAllPersonel().find((p) => p.ad_soyad === user.ad_soyad);
  const sefAdalar = isSantiyeSefi(user.ad_soyad) ? getSefAdalar(user.ad_soyad) : [];
  const raporSayisi = getPersonelRaporlari(user.ad_soyad).length;

  const handleLogout = async () => {
    if (await onayla('Çıkış yapmak istediğinize emin misiniz?')) {
      cikisYap();
      navigate('/login');
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>Profil</h1>

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          border: '1px solid #f0f0f0',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 8 }}>👤</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>{user.ad_soyad}</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
          {user.rol}
          {user.admin && (
            <span style={{ color: '#f59e0b', fontWeight: 600 }}> • Yönetici</span>
          )}
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          border: '1px solid #f0f0f0',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 12 }}>
          Hesap Bilgileri
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#6b7280' }}>Rol</span>
            <span style={{ color: '#1f2937', fontWeight: 500 }}>{user.rol}</span>
          </div>
          {sefAdalar.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#6b7280' }}>Yetkili Adalar</span>
              <span style={{ color: '#1f2937', fontWeight: 500 }}>{sefAdalar.join(', ')}</span>
            </div>
          )}
          {atananAda && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#6b7280' }}>Atanan Ada</span>
              <span style={{ color: '#1f2937', fontWeight: 500 }}>{atananAda}</span>
            </div>
          )}
          {atananAda && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#6b7280' }}>Atanan Bloklar</span>
              <span style={{ color: '#1f2937', fontWeight: 500 }}>
                {(() => {
                  const bloklar = getKullaniciBloklari(user.ad_soyad, atananAda);
                  return bloklar.length > 0
                    ? bloklar.sort((a, b) => a - b).join(', ')
                    : 'Tüm bloklar';
                })()}
              </span>
            </div>
          )}
          {kisi?.atanan_ada && !atananAda && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#6b7280' }}>Varsayılan Ada</span>
              <span style={{ color: '#1f2937', fontWeight: 500 }}>{kisi.atanan_ada}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#6b7280' }}>Toplam Rapor</span>
            <span style={{ color: '#1f2937', fontWeight: 500 }}>{raporSayisi}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#6b7280' }}>Giriş Zamanı</span>
            <span style={{ color: '#1f2937', fontWeight: 500 }}>
              {new Date(user.giris_tarihi).toLocaleString('tr-TR')}
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          border: '1px solid #f0f0f0',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 4 }}>
          🔔 Bildirimler
        </h3>
        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, marginBottom: 12 }}>
          Geciken işler ve bugünkü hedefler için uyarı alın.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: '#4b5563' }}>
            İzin Durumu:{' '}
            <span style={{ fontWeight: 600, color: izinDurumu === 'granted' ? '#16a34a' : izinDurumu === 'denied' ? '#ef4444' : '#f59e0b' }}>
              {izinDurumu === 'granted' ? 'Verildi ✓' : izinDurumu === 'denied' ? 'Reddedildi' : izinDurumu === 'unsupported' ? 'Desteklenmiyor' : 'İstenmedi'}
            </span>
          </span>
          {izinDurumu !== 'granted' && izinDurumu !== 'unsupported' && (
            <button
              onClick={async () => {
                const durum = await bildirimIzniIste();
                setIzinDurumu(durum);
                if (durum === 'granted') {
                  toastGoster('Bildirim izni verildi', 'success');
                  hedefUyarilariniGoster();
                } else if (durum === 'denied') {
                  toastGoster('İzin verilmedi — cihaz ayarlarından açabilirsiniz', 'error');
                }
              }}
              style={{
                padding: '6px 12px', backgroundColor: '#1f2937', border: 'none',
                borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer',
              }}
            >
              İzin Ver
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #f3f4f6' }}>
          <div>
            <div style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Hedef / geciken iş uyarıları</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Uygulama açıkken günde bir kez bildirilir</div>
          </div>
          <input
            type="checkbox"
            checked={ayarlar.uyariAcik}
            onChange={(e) => ayarlariGuncelle({ ...ayarlar, uyariAcik: e.target.checked })}
            style={{ transform: 'scale(1.4)', cursor: 'pointer' }}
          />
        </div>

        {nativeBildirimVarMi() && (
          <div style={{ padding: '8px 0', borderTop: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Günlük özet bildirimi</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Uygulama kapalıyken de gönderilir</div>
              </div>
              <input
                type="checkbox"
                checked={ayarlar.gunlukOzet}
                onChange={(e) => ayarlariGuncelle({ ...ayarlar, gunlukOzet: e.target.checked })}
                style={{ transform: 'scale(1.4)', cursor: 'pointer' }}
              />
            </div>
            {ayarlar.gunlukOzet && (
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 12, color: '#6b7280', marginRight: 8 }}>Saat</label>
                <input
                  type="time"
                  value={ayarlar.gunlukSaat}
                  onChange={(e) => ayarlariGuncelle({ ...ayarlar, gunlukSaat: e.target.value })}
                  style={{
                    padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13,
                  }}
                />
              </div>
            )}
          </div>
        )}

        <button
          onClick={async () => {
            const ok = await testBildirimGonder();
            if (ok) toastGoster('Test bildirimi gönderildi', 'success');
            else toastGoster('Bildirim gönderilemedi — önce izin verin', 'error');
          }}
          style={{
            marginTop: 8, width: '100%', padding: '10px',
            backgroundColor: '#f3f4f6', border: 'none', borderRadius: 10,
            fontSize: 13, fontWeight: 600, color: '#4b5563', cursor: 'pointer',
          }}
        >
          📨 Test bildirimi gönder
        </button>
      </div>

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          border: '1px solid #f0f0f0',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 12 }}>
          Hızlı Erişim
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => navigate('/rapor-ekle')}
            style={{
              padding: '12px 16px',
              backgroundColor: '#fef3c7',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: '#92400e',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            ➕ Rapor Ekle
          </button>
          <button
            onClick={() => navigate('/raporlar')}
            style={{
              padding: '12px 16px',
              backgroundColor: '#f3f4f6',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: '#4b5563',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            📋 Raporlarım
          </button>
          {user.admin && (
            <button
              onClick={() => navigate('/personel')}
              style={{
                padding: '12px 16px',
                backgroundColor: '#dbeafe',
                border: 'none',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                color: '#1e40af',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              👥 Personel Yönetimi
            </button>
          )}
        </div>
      </div>

      <button
        onClick={handleLogout}
        style={{
          width: '100%',
          padding: 14,
          backgroundColor: '#fef2f2',
          border: 'none',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600,
          color: '#ef4444',
          cursor: 'pointer',
        }}
      >
        Çıkış Yap
      </button>
    </div>
  );
}
