import { useNavigate, NavLink } from 'react-router-dom';
import { getCurrentUser, cikisYap, isProjeMuduruSession } from '../stores/authStore';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useTema } from '../hooks/useTema';
import { onayla } from '../utils/dialog';
import type { TemaSecim } from '../stores/themeStore';

const temaSecenekler: { deger: TemaSecim; ikon: string; etiket: string }[] = [
  { deger: 'light', ikon: '☀️', etiket: 'Açık' },
  { deger: 'dark', ikon: '🌙', etiket: 'Koyu' },
  { deger: 'system', ikon: '🖥️', etiket: 'Sistem' },
];

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/adalar', label: 'Adalar', icon: '🏗️' },
  { to: '/rapor-ekle', label: 'Rapor', icon: '➕', fab: true },
  { to: '/raporlar', label: 'Raporlar', icon: '📋' },
  { to: '/istatistik', label: 'İstatistik', icon: '📈', desktopOnly: true },
  { to: '/hakedis', label: 'Hakediş', icon: '🧾' },
  { to: '/personel', label: 'Personel', icon: '👥' },
  { to: '/ayarlar', label: 'Ayarlar', icon: '⚙️' },
];

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props) {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const config = useSiteConfig();
  const isDesktop = useIsDesktop();
  const { secim: temaSecim, setSecim: setTemaSecim } = useTema();

  const temaToggle = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: 3,
        borderRadius: 10,
        backgroundColor: 'var(--bg-subtle)',
        border: '1px solid var(--border)',
      }}
    >
      {temaSecenekler.map((s) => (
        <button
          key={s.deger}
          onClick={() => setTemaSecim(s.deger)}
          title={`${s.etiket} tema`}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            background: temaSecim === s.deger ? 'var(--bg-card)' : 'transparent',
            border: 'none',
            borderRadius: 7,
            padding: '5px 8px',
            fontSize: 12,
            color: temaSecim === s.deger ? 'var(--accent)' : 'var(--text-faint)',
            fontWeight: temaSecim === s.deger ? 600 : 400,
            cursor: 'pointer',
            boxShadow: temaSecim === s.deger ? 'var(--shadow-card)' : 'none',
          }}
        >
          <span style={{ fontSize: 13 }}>{s.ikon}</span>
          <span>{s.etiket}</span>
        </button>
      ))}
    </div>
  );

  const gorunurNav = navItems.filter((item) => {
    if (item.desktopOnly) return isDesktop;
    if (item.to === '/personel') return true;
    if (item.to === '/ayarlar') return isProjeMuduruSession();
    return true;
  });

  const handleLogout = async () => {
    if (await onayla('Çıkış yapmak istediğinize emin misiniz?')) {
      cikisYap();
      navigate('/login');
    }
  };

  if (isDesktop) {
    return (
      <div style={{ maxWidth: 1360, margin: '0 auto', minHeight: '100dvh', backgroundColor: 'var(--bg-page)', display: 'flex' }}>
        <aside
          style={{
            width: 248,
            flexShrink: 0,
            backgroundColor: 'var(--bg-card)',
            borderRight: '1px solid #e5e7eb',
            position: 'sticky',
            top: 0,
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 14px',
            overflowY: 'auto',
          }}
        >
          <div
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer', padding: '0 8px 18px', borderBottom: '1px solid #f0f0f0', marginBottom: 14 }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{config.genel.santiyeAdi}</div>
            <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{config.genel.projeAdi}</div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            {gorunurNav
              .filter((item) => !item.fab)
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#f59e0b' : 'var(--text-muted)',
                    backgroundColor: isActive ? 'var(--bg-accent)' : 'transparent',
                  })}
                >
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            {gorunurNav.find((item) => item.fab) && (
              <NavLink
                to="/rapor-ekle"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 10,
                  marginTop: 6,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  backgroundColor: '#f59e0b',
                  boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
                }}
              >
                <span style={{ fontSize: 18 }}>➕</span>
                <span>Yeni Rapor</span>
              </NavLink>
            )}
          </nav>

          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
              👤 {user?.ad_soyad ?? 'Giriş yapılmadı'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginBottom: 8 }}>
              {user?.rol}
              {isProjeMuduruSession() && ' 👑 Proje Müdürü'}
              {user?.admin && !isProjeMuduruSession() && ' • Yönetici'}
            </div>
            <div style={{ marginBottom: 8 }}>{temaToggle}</div>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 12,
                color: 'var(--text-faint)',
                cursor: 'pointer',
              }}
            >
              Çıkış
            </button>
          </div>
        </aside>

        <main style={{ flex: 1, minWidth: 0, padding: '24px 28px 48px' }}>{children}</main>
      </div>
    );
  }

  const mobilNav = gorunurNav.filter((item) => !item.desktopOnly);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100dvh', backgroundColor: 'var(--bg-page)', position: 'relative', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px 0 16px',
        }}
      >
        <div
          onClick={() => navigate('/profil')}
          style={{ fontSize: 13, color: 'var(--text-faint)', cursor: 'pointer' }}
        >
          {user && (
            <span>
              👤 {user.ad_soyad}{' '}
              <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                ({user.rol})
                {isProjeMuduruSession() && (
                  <span style={{ color: '#8b5cf6', fontWeight: 600 }}> 👑 Proje Müdürü</span>
                )}
                {user.admin && !isProjeMuduruSession() && (
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}> • Yönetici</span>
                )}
              </span>
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 'auto' }}>{temaToggle}</div>
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 11,
              color: 'var(--text-faint)',
              cursor: 'pointer',
            }}
          >
            Çıkış
          </button>
        </div>
      </div>
      <div style={{ padding: '16px 16px 80px 16px' }}>{children}</div>
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 480,
          backgroundColor: 'var(--bg-card)',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '6px 0',
          paddingBottom: 'env(safe-area-inset-bottom, 6px)',
          zIndex: 100,
          boxShadow: '0 -1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {mobilNav.map((item) =>
          item.fab ? (
            <NavLink
              key={item.to}
              to={item.to}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                color: 'var(--text-faint)',
                fontSize: 10,
                gap: 2,
                marginTop: -20,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  backgroundColor: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  boxShadow: '0 2px 8px rgba(245,158,11,0.4)',
                  color: '#fff',
                }}
              >
                {item.icon}
              </div>
              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{item.label}</span>
            </NavLink>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textDecoration: 'none',
                color: isActive ? '#f59e0b' : 'var(--text-subtle)',
                fontSize: 10,
                gap: 2,
                padding: '4px 0',
                fontWeight: isActive ? 600 : 400,
              })}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          )
        )}
      </nav>
    </div>
  );
}
