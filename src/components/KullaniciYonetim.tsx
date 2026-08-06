import { useState } from 'react';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { getAdaList } from '../config/helpers';
import { getCurrentUser } from '../stores/authStore';
import type { Kullanici } from '../stores/kullanicilarStore';
import {
  santiyeKullaniciOlustur,
  santiyeKullaniciSifreSifirla,
  santiyeKullaniciSil,
  santiyeKullaniciGuncelle,
  kullaniciEpostasi,
} from '../stores/kullaniciYonetimStore';
import { toastGoster } from '../stores/toastStore';
import { card } from '../utils/styles';

export function YeniKullaniciForm({ onIptal, onKaydedildi }: { onIptal: () => void; onKaydedildi: () => void }) {
  const config = useSiteConfig();
  const adalar = getAdaList(config);
  const sahaRolleri = config.roller.sahaPersoneliRolleri;

  const [adSoyad, setAdSoyad] = useState('');
  const [rol, setRol] = useState(sahaRolleri[0] ?? 'Personel');
  const [sifre, setSifre] = useState('');
  const [admin, setAdmin] = useState(false);
  const [projeMuduru, setProjeMuduru] = useState(false);
  const [atananAda, setAtananAda] = useState('');
  const [yetkiliAdalar, setYetkiliAdalar] = useState<Set<string>>(new Set());
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState('');
  const [olusturulanEposta, setOlusturulanEposta] = useState('');

  const rolSecenekleri = [...new Set([...sahaRolleri, 'Şantiye Şefi', 'Proje Müdürü'])];

  const toggleYetkiliAda = (ada: string) => {
    const yeni = new Set(yetkiliAdalar);
    if (yeni.has(ada)) yeni.delete(ada);
    else yeni.add(ada);
    setYetkiliAdalar(yeni);
  };

  const kaydet = async () => {
    setHata('');
    if (!adSoyad.trim()) {
      setHata('Ad soyad yazın.');
      return;
    }
    if (sifre.length < 6) {
      setHata('Şifre en az 6 karakter olmalı.');
      return;
    }
    setKaydediliyor(true);
    try {
      const sonuc = await santiyeKullaniciOlustur({
        ad_soyad: adSoyad.trim(),
        rol,
        sifre,
        admin,
        proje_muduru: projeMuduru,
        yetkili_adalar: [...yetkiliAdalar],
        atanan_ada: atananAda || null,
      });
      setOlusturulanEposta(sonuc.email);
      toastGoster(`${adSoyad.trim()} kullanıcısı oluşturuldu`, 'success');
      onKaydedildi();
    } catch (err) {
      setHata(err instanceof Error ? err.message : 'Kullanıcı oluşturulamadı');
    } finally {
      setKaydediliyor(false);
    }
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
  const toggleStyle: React.CSSProperties = { transform: 'scale(1.4)', cursor: 'pointer' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: 0 }}>Yeni Kullanıcı</h1>
        <button
          onClick={onIptal}
          style={{
            padding: '8px 16px', backgroundColor: '#f3f4f6', border: 'none',
            borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#4b5563', cursor: 'pointer',
          }}
        >
          İptal
        </button>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Ad Soyad</label>
            <input style={inputStyle} value={adSoyad} onChange={(e) => setAdSoyad(e.target.value)} placeholder="Orhan Yılmaz" />
          </div>
          <div>
            <label style={labelStyle}>Rol</label>
            <select style={inputStyle} value={rol} onChange={(e) => setRol(e.target.value)}>
              {rolSecenekleri.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Geçici Şifre</label>
            <input
              type="text"
              style={inputStyle}
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              placeholder="en az 6 karakter"
            />
          </div>
          <div>
            <label style={labelStyle}>
              Giriş E-postası <span style={{ color: '#9ca3af' }}>(otomatik)</span>
            </label>
            <div style={{ fontSize: 13, color: '#6b7280', backgroundColor: '#f9fafb', padding: '10px 12px', borderRadius: 10 }}>
              {adSoyad.trim() ? kullaniciEpostasi(adSoyad.trim()) : '—'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
            <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Yönetici (Şantiye Şefi yetkisi)</span>
            <input type="checkbox" checked={admin} onChange={(e) => setAdmin(e.target.checked)} style={toggleStyle} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Proje Müdürü</span>
            <input type="checkbox" checked={projeMuduru} onChange={(e) => setProjeMuduru(e.target.checked)} style={toggleStyle} />
          </div>

          <div>
            <label style={labelStyle}>Atanacağı Ada</label>
            <select style={inputStyle} value={atananAda} onChange={(e) => setAtananAda(e.target.value)}>
              <option value="">Atanmamış</option>
              {adalar.map((a) => (
                <option key={a.ada} value={a.ada}>{a.ada}</option>
              ))}
            </select>
          </div>

          {admin && (
            <div>
              <label style={labelStyle}>Yetkili Adalar</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {adalar.map((a) => {
                  const secili = yetkiliAdalar.has(a.ada);
                  return (
                    <label key={a.ada} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#4b5563', cursor: 'pointer' }}>
                      <input type="checkbox" checked={secili} onChange={() => toggleYetkiliAda(a.ada)} style={{ cursor: 'pointer' }} />
                      {a.ada}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {hata && (
          <div style={{ marginTop: 12, fontSize: 12, color: '#ef4444', backgroundColor: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>
            {hata}
          </div>
        )}
        {olusturulanEposta && (
          <div style={{ marginTop: 12, fontSize: 12, color: '#16a34a', backgroundColor: '#f0fdf4', padding: '8px 12px', borderRadius: 8 }}>
            Kullanıcı oluşturuldu. Giriş: <b>{olusturulanEposta}</b>
          </div>
        )}

        <button
          onClick={kaydet}
          disabled={kaydediliyor}
          style={{
            marginTop: 14, width: '100%', padding: 12,
            backgroundColor: kaydediliyor ? '#e5e7eb' : '#f59e0b',
            border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600,
            color: kaydediliyor ? '#9ca3af' : '#fff',
            cursor: kaydediliyor ? 'not-allowed' : 'pointer',
          }}
        >
          {kaydediliyor ? 'Oluşturuluyor…' : 'Kullanıcıyı Oluştur'}
        </button>
      </div>
    </div>
  );
}

export function KullaniciYetkiKarti({ kullanici }: { kullanici: Kullanici }) {
  const config = useSiteConfig();
  const adalar = getAdaList(config);
  const user = getCurrentUser();
  const kendim = user?.ad_soyad === kullanici.ad_soyad;
  const kayitli = !!kullanici.id;

  const [rol, setRol] = useState(kullanici.rol);
  const [admin, setAdmin] = useState(kullanici.admin);
  const [projeMuduru, setProjeMuduru] = useState(kullanici.proje_muduru);
  const [atananAda, setAtananAda] = useState(kullanici.atanan_ada ?? '');
  const [yetkiliAdalar, setYetkiliAdalar] = useState<Set<string>>(() => new Set(kullanici.yetkili_adalar));
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const sahaRolleri = config.roller.sahaPersoneliRolleri;
  const rolSecenekleri = [...new Set([...sahaRolleri, 'Şantiye Şefi', 'Proje Müdürü'])];

  const toggleYetkiliAda = (ada: string) => {
    const yeni = new Set(yetkiliAdalar);
    if (yeni.has(ada)) yeni.delete(ada);
    else yeni.add(ada);
    setYetkiliAdalar(yeni);
  };

  const kaydet = async () => {
    setKaydediliyor(true);
    try {
      await santiyeKullaniciGuncelle(kullanici.id!, {
        rol,
        admin,
        proje_muduru: projeMuduru,
        atanan_ada: atananAda || null,
        yetkili_adalar: [...yetkiliAdalar],
      });
      toastGoster(`${kullanici.ad_soyad} güncellendi`, 'success');
    } catch (err) {
      toastGoster(err instanceof Error ? err.message : 'Güncellenemedi', 'error');
    } finally {
      setKaydediliyor(false);
    }
  };

  const sifreSifirla = async () => {
    const yeniSifre = window.prompt(`${kullanici.ad_soyad} için yeni şifre (en az 6 karakter):`);
    if (!yeniSifre) return;
    try {
      await santiyeKullaniciSifreSifirla(kullanici.id!, yeniSifre);
      toastGoster('Şifre sıfırlandı', 'success');
    } catch (err) {
      toastGoster(err instanceof Error ? err.message : 'Şifre sıfırlanamadı', 'error');
    }
  };

  const sil = async () => {
    if (!window.confirm(`${kullanici.ad_soyad} kullanıcısı silinsin mi? Raporları korunur, hesabı kapatılır.`)) return;
    try {
      await santiyeKullaniciSil(kullanici.id!);
      toastGoster('Kullanıcı silindi', 'success');
    } catch (err) {
      toastGoster(err instanceof Error ? err.message : 'Silinemedi', 'error');
    }
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

  if (!kayitli) {
    return (
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#9ca3af' }}>
          Bu personel listede var ama hesap (auth) kaydı bulunmuyor. Yeni kullanıcı oluşturmak için listeye dönüp
          "Yeni Kullanıcı" kullanın.
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0, marginBottom: 12 }}>
        Yetki ve Rol
        {kendim && <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}> (kendi kaydınız)</span>}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}>Rol</label>
          <select style={inputStyle} value={rol} onChange={(e) => setRol(e.target.value)} disabled={kendim}>
            {rolSecenekleri.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Yönetici (Şantiye Şefi)</span>
          <input
            type="checkbox"
            checked={admin}
            disabled={kendim}
            onChange={(e) => setAdmin(e.target.checked)}
            style={{ transform: 'scale(1.4)', cursor: kendim ? 'not-allowed' : 'pointer' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Proje Müdürü</span>
          <input
            type="checkbox"
            checked={projeMuduru}
            disabled={kendim}
            onChange={(e) => setProjeMuduru(e.target.checked)}
            style={{ transform: 'scale(1.4)', cursor: kendim ? 'not-allowed' : 'pointer' }}
          />
        </div>
        {admin && (
          <div>
            <label style={labelStyle}>Yetkili Adalar</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {adalar.map((a) => {
                const secili = yetkiliAdalar.has(a.ada);
                return (
                  <label key={a.ada} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#4b5563', cursor: 'pointer' }}>
                    <input type="checkbox" checked={secili} onChange={() => toggleYetkiliAda(a.ada)} style={{ cursor: 'pointer' }} />
                    {a.ada}
                  </label>
                );
              })}
            </div>
          </div>
        )}
        <div>
          <label style={labelStyle}>Varsayılan Ada</label>
          <select style={inputStyle} value={atananAda} onChange={(e) => setAtananAda(e.target.value)}>
            <option value="">Atanmamış</option>
            {adalar.map((a) => (
              <option key={a.ada} value={a.ada}>{a.ada}</option>
            ))}
          </select>
        </div>

        <button
          onClick={kaydet}
          disabled={kaydediliyor}
          style={{
            width: '100%', padding: 11, backgroundColor: kaydediliyor ? '#e5e7eb' : '#f59e0b',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
            color: kaydediliyor ? '#9ca3af' : '#fff',
            cursor: kaydediliyor ? 'not-allowed' : 'pointer',
          }}
        >
          {kaydediliyor ? 'Kaydediliyor…' : 'Yetkileri Kaydet'}
        </button>

        <button
          onClick={sifreSifirla}
          style={{
            width: '100%', padding: 11, backgroundColor: '#f3f4f6',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
            color: '#4b5563', cursor: 'pointer',
          }}
        >
          🔑 Şifre Sıfırla
        </button>

        {!kendim && (
          <button
            onClick={sil}
            style={{
              width: '100%', padding: 11, backgroundColor: '#fef2f2',
              border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
              color: '#ef4444', cursor: 'pointer',
            }}
          >
            🗑️ Kullanıcıyı Sil
          </button>
        )}
      </div>
    </div>
  );
}
