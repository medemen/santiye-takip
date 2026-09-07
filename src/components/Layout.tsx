import { useNavigate, NavLink } from 'react-router-dom';
import { getCurrentUser, isProjeMuduruSession } from '../stores/authStore';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useIsDesktop } from '../hooks/useIsDesktop';

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

  const gorunurNav = navItems.filter((item) => {
    if (item.desktopOnly) return isDesktop;
    if (item.to === '/personel') return true;
    if (item.to === '/ayarlar') return isProjeMuduruSession();
    return true;
  });

  if (isDesktop) {
    return (
      <div style={{ maxWidth: 1360, margin: '0 auto', minHeight: '100dvh', backgroundColor: 'var(--bg-page)', display: 'flex' }}>
        <aside
          style={{
            width: 248,
            flexShrink: 0,
            backgroundColor: 'var(--bg-card)',
            borderRight: '1px solid var(--border)',
            position: 'sticky',
            top: 0,
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 14px',
            overflowY: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer', padding: '0 8px 18px', marginBottom: 14, background: 'none', border: 'none', borderBottom: '1px solid var(--border-soft)', textAlign: 'left', font: 'inherit', width: '100%' }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{config.genel.santiyeAdi}</div>
            <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{config.genel.projeAdi}</div>
          </button>

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

          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
              👤 {user?.ad_soyad ?? 'Giriş yapılmadı'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginBottom: 8 }}>
              {user?.rol}
              {isProjeMuduruSession() && ' 👑 Proje Müdürü'}
              {user?.admin && !isProjeMuduruSession() && ' • Yönetici'}
            </div>
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
          borderTop: '1px solid var(--border)',
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
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                bottom: 'calc(env(safe-area-inset-bottom, 6px) + 86px)',
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                zIndex: 101,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 56,
                  padding: '0 18px',
                  borderRadius: 28,
                  backgroundColor: '#f59e0b',
                  boxShadow: '0 4px 14px rgba(245,158,11,0.45)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  minWidth: 44,
                }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span>Rapor</span>
              </div>
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
