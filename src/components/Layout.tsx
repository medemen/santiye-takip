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
                    color: isActive ? 'var(--accent-dark)' : 'var(--text-muted)',
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
                  color: 'var(--on-accent)',
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
  const mobilNormal = mobilNav.filter((item) => !item.fab);
  const raporFab = mobilNav.find((item) => item.fab);
  const yarim = Math.floor(mobilNormal.length / 2);
  const solNav = mobilNormal.slice(0, yarim);
  const sagNav = mobilNormal.slice(yarim);

  const mobilDugme = (item: (typeof navItems)[number]) => (
    <NavLink
      key={item.to}
      to={item.to}
      style={({ isActive }) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textDecoration: 'none',
        color: isActive ? 'var(--accent-dark)' : 'var(--text-subtle)',
        fontSize: 10,
        gap: 2,
        padding: '4px 0',
        fontWeight: isActive ? 600 : 400,
        whiteSpace: 'nowrap',
      })}
    >
      <span style={{ fontSize: 20 }}>{item.icon}</span>
      <span>{item.label}</span>
    </NavLink>
  );

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
                  <span style={{ color: 'var(--text-brand)', fontWeight: 600 }}> 👑 Proje Müdürü</span>
                )}
                {user.admin && !isProjeMuduruSession() && (
                  <span style={{ color: 'var(--accent-dark)', fontWeight: 600 }}> • Yönetici</span>
                )}
              </span>
            </span>
          )}
        </div>
      </div>
      <main style={{ padding: '16px 16px calc(env(safe-area-inset-bottom, 0px) + 96px) 16px' }}>{children}</main>
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
          alignItems: 'center',
          padding: '6px 4px',
          paddingBottom: 'env(safe-area-inset-bottom, 6px)',
          zIndex: 100,
          boxShadow: '0 -1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', flex: 1, justifyContent: 'space-around', alignItems: 'center' }}>
          {solNav.map(mobilDugme)}
        </div>
        {raporFab && (
          <NavLink
            to={raporFab.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              flexShrink: 0,
              height: 42,
              margin: '0 4px',
              padding: '0 16px',
              borderRadius: 21,
              textDecoration: 'none',
              backgroundColor: isActive ? '#d97706' : '#f59e0b',
              boxShadow: '0 2px 8px rgba(245,158,11,0.4)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--on-accent)',
              whiteSpace: 'nowrap',
            })}
          >
            <span style={{ fontSize: 16 }}>{raporFab.icon}</span>
            <span>Rapor</span>
          </NavLink>
        )}
        <div style={{ display: 'flex', flex: 1, justifyContent: 'space-around', alignItems: 'center' }}>
          {sagNav.map(mobilDugme)}
        </div>
      </nav>
    </div>
  );
}
