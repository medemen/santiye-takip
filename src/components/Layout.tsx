import { useNavigate, NavLink } from 'react-router-dom';
import { useReducer, useEffect } from 'react';
import { getCurrentUser, cikisYap, isProjeMuduruSession } from '../store/authStore';
import { subscribeRaporChanges } from '../store/reportStore';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/adalar', label: 'Adalar', icon: '🏗️' },
  { to: '/rapor-ekle', label: 'Rapor', icon: '➕', fab: true },
  { to: '/raporlar', label: 'Raporlar', icon: '📋' },
  { to: '/personel', label: 'Personel', icon: '👥' },
  { to: '/toplu-rapor', label: 'Toplu', icon: '📦' },
];

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props) {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const gorunurNav = navItems.filter(
    (item) => !['/personel', '/toplu-rapor'].includes(item.to) || (user?.admin ?? false)
  );

  useEffect(() => {
    const unsub = subscribeRaporChanges(() => forceUpdate());
    return unsub;
  }, []);

  const handleLogout = () => {
    if (window.confirm('Çıkış yapmak istediğinize emin misiniz?')) {
      cikisYap();
      navigate('/login');
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100dvh', backgroundColor: '#f8fafc', position: 'relative', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
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
          style={{ fontSize: 13, color: '#6b7280', cursor: 'pointer' }}
        >
          {user && (
            <span>
              👤 {user.ad_soyad}{' '}
              <span style={{ fontSize: 11, color: '#9ca3af' }}>
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
        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '4px 10px',
            fontSize: 11,
            color: '#6b7280',
            cursor: 'pointer',
          }}
        >
          Çıkış
        </button>
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
          backgroundColor: '#fff',
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
        {gorunurNav.map((item) =>
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
                color: '#6b7280',
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
              <span style={{ fontWeight: 600, color: '#4b5563' }}>{item.label}</span>
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
                color: isActive ? '#f59e0b' : '#9ca3af',
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
