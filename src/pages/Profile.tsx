import { useNavigate } from 'react-router-dom';
import { getCurrentUser, cikisYap } from '../store/authStore';
import { getKullaniciAdaAtamasi, getKullaniciBloklari } from '../store/atamaStore';
import { getPersonelRaporlari } from '../store/reportStore';
import { personelData } from '../data/personelData';

export default function Profile() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  if (!user) return null;

  const atananAda = getKullaniciAdaAtamasi(user.ad_soyad);
  const kisi = personelData.personel.find((p) => p.ad_soyad === user.ad_soyad);
  const sef = personelData.santiye_sefleri.find((s) => s.ad_soyad === user.ad_soyad);
  const raporSayisi = getPersonelRaporlari(user.ad_soyad).length;

  const handleLogout = () => {
    if (window.confirm('Çıkış yapmak istediğinize emin misiniz?')) {
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
          {sef && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#6b7280' }}>Yetkili Adalar</span>
              <span style={{ color: '#1f2937', fontWeight: 500 }}>{sef.adalar.join(', ')}</span>
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
