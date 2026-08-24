import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getKullanicilar } from '../stores/kullanicilarStore';
import { girisYap } from '../stores/authStore';
import { toastGoster } from '../stores/toastStore';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { isSupabaseReady } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const config = useSiteConfig();
  const [selected, setSelected] = useState('');
  const [sifre, setSifre] = useState('');
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const supabaseAktif = isSupabaseReady();

  const tumKullanicilar = getKullanicilar().map((k) => ({
    ad_soyad: k.ad_soyad,
    rol: k.rol,
  }));

  const yoneticiler = getKullanicilar()
    .filter((k) => k.admin || k.proje_muduru)
    .map((k) => ({ ad_soyad: k.ad_soyad, rol: k.rol }));

  const standartKullanicilar = getKullanicilar()
    .filter((k) => !k.admin && !k.proje_muduru)
    .map((k) => ({ ad_soyad: k.ad_soyad, rol: k.rol }));

  const handleGiris = async () => {
    if (!selected || yukleniyor) return;
    const kisi = tumKullanicilar.find((p) => p.ad_soyad === selected);
    if (!kisi) return;
    setYukleniyor(true);
    setHata('');
    try {
      await girisYap(kisi.ad_soyad, kisi.rol, sifre);
      navigate('/');
    } catch (err) {
      const mesaj = err instanceof Error ? err.message : 'Giriş yapılamadı';
      setHata(mesaj);
      toastGoster(mesaj, 'error');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '80dvh',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🏗️</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {config.genel.santiyeAdi}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 4 }}>
          Rapor Takip Sistemi
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); void handleGiris(); }}
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid var(--border-soft)',
        }}
      >
        <label htmlFor="login-kullanici" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>
          Kullanıcı Adı
        </label>
        <select
          id="login-kullanici"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={yukleniyor}
          autoComplete="off"
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 12,
            border: '2px solid var(--border)', fontSize: 14, backgroundColor: 'var(--bg-card)',
            boxSizing: 'border-box', marginBottom: 16,
          }}
        >
          <option value="">Kişi seçin</option>
          <optgroup label="👑 Yöneticiler">
            {yoneticiler.map((k) => (
              <option key={k.ad_soyad} value={k.ad_soyad}>
                {k.ad_soyad} ({k.rol})
              </option>
            ))}
          </optgroup>
          <optgroup label="👥 Standart Kullanıcılar">
            {standartKullanicilar.map((k) => (
              <option key={k.ad_soyad} value={k.ad_soyad}>
                {k.ad_soyad} ({k.rol})
              </option>
            ))}
          </optgroup>
        </select>

        {supabaseAktif && (
          <>
            <label htmlFor="login-sifre" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>
              Şifre
            </label>
            <input
              id="login-sifre"
              type="password"
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              disabled={yukleniyor}
              autoComplete="current-password"
              placeholder="Şifrenizi girin"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                border: '2px solid var(--border)', fontSize: 14, backgroundColor: 'var(--bg-card)',
                boxSizing: 'border-box', marginBottom: 16,
                color: 'var(--text-primary)',
              }}
            />
          </>
        )}

        {!supabaseAktif && (
          <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: '0 0 16px' }}>
            Sunucu bağlantısı yok — çevrimdışı modda yerel verilerle giriş yapılır.
          </p>
        )}

        {hata && (
          <p role="alert" style={{ fontSize: 13, color: '#dc2626', margin: '0 0 12px', fontWeight: 500 }}>
            {hata}
          </p>
        )}

        <button
          type="submit"
          disabled={!selected || yukleniyor || (supabaseAktif && !sifre)}
          style={{
            width: '100%', padding: '14px',
            backgroundColor: selected && !yukleniyor && (!supabaseAktif || sifre) ? '#f59e0b' : 'var(--border)',
            border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
            color: selected && !yukleniyor && (!supabaseAktif || sifre) ? '#fff' : 'var(--text-subtle)',
            cursor: selected && !yukleniyor && (!supabaseAktif || sifre) ? 'pointer' : 'not-allowed',
          }}
        >
          {yukleniyor ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  );
}
