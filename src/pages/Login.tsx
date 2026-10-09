import { useMemo, useState } from 'react';
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
  const [arama, setArama] = useState('');
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const supabaseAktif = isSupabaseReady();

  const tumKullanicilar = getKullanicilar().map((k) => ({
    ad_soyad: k.ad_soyad,
    rol: k.rol,
    yonetici: k.admin || k.proje_muduru,
  }));

  const gruplar = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr');
    const eslesen = q
      ? tumKullanicilar.filter((k) => k.ad_soyad.toLocaleLowerCase('tr').includes(q))
      : tumKullanicilar;
    return [
      { baslik: '👑 Yöneticiler', kisiler: eslesen.filter((k) => k.yonetici) },
      { baslik: '👥 Standart Kullanıcılar', kisiler: eslesen.filter((k) => !k.yonetici) },
    ].filter((g) => g.kisiler.length > 0);
  }, [arama, tumKullanicilar]);

  const handleGiris = async () => {
    if (!selected || yukleniyor) return;
    const kisi = tumKullanicilar.find((p) => p.ad_soyad === selected);
    if (!kisi) return;
    setYukleniyor(true);
    setHata('');
    try {
      await girisYap(kisi.ad_soyad, kisi.rol);
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
        <label htmlFor="login-arama" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>
          Kullanıcı Adı
        </label>
        <input
          id="login-arama"
          type="text"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          disabled={yukleniyor}
          autoComplete="off"
          placeholder="İsimle ara…"
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 12,
            border: '2px solid var(--border)', fontSize: 14, backgroundColor: 'var(--bg-card)',
            boxSizing: 'border-box', marginBottom: 8,
          }}
        />

        <div
          id="login-kullanici"
          role="listbox"
          aria-label="Kullanıcı seçimi"
          style={{
            maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)',
            borderRadius: 12, padding: 4, marginBottom: 16, backgroundColor: 'var(--bg-card)',
          }}
        >
          {gruplar.length === 0 && (
            <div style={{ padding: '12px', fontSize: 13, color: 'var(--text-faint)', textAlign: 'center' }}>
              Kişi bulunamadı
            </div>
          )}
          {gruplar.map((grup) => (
            <div key={grup.baslik}>
              <div style={{ padding: '6px 10px 2px', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)' }}>
                {grup.baslik}
              </div>
              {grup.kisiler.map((k) => {
                const secili = selected === k.ad_soyad;
                return (
                  <button
                    key={k.ad_soyad}
                    type="button"
                    role="option"
                    aria-selected={secili}
                    disabled={yukleniyor}
                    onClick={() => setSelected(k.ad_soyad)}
                    className={`login-secim${secili ? ' login-secim--secili' : ''}`}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                      width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8,
                      border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
                      color: 'var(--text-primary)',
                      fontWeight: secili ? 700 : 500,
                    }}
                  >
                    <span>{k.ad_soyad}{secili ? ' ✓' : ''}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{k.rol}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {supabaseAktif && (
          <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: '0 0 16px' }}>
            Şifre gerekmez — seçtiğiniz hesapla oturum açılır.
          </p>
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
          disabled={!selected || yukleniyor}
          style={{
            width: '100%', padding: '14px',
            backgroundColor: selected && !yukleniyor ? '#f59e0b' : 'var(--border)',
            border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
            color: selected && !yukleniyor ? '#fff' : 'var(--text-subtle)',
            cursor: selected && !yukleniyor ? 'pointer' : 'not-allowed',
          }}
        >
          {yukleniyor ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  );
}
