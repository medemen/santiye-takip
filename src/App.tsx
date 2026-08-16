import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Toast from './components/Toast';
import { isLoggedIn, isProjeMuduruSession, supabaseAuthInit, subscribeAuthChanges } from './stores/authStore';
import { supabaseRaporlariYukle, aboneOlRaporGuncellemeleri, realtimeRaporAboneliktenCik } from './stores/reportStore';
import { supabaseAtamalariYukle, aboneOlAtamaGuncellemeleri, realtimeAtamaAboneliktenCik } from './stores/atamaStore';
import { supabaseKullanicilariYukle } from './stores/kullanicilarStore';
import { supabaseHedefleriYukle, aboneOlHedefGuncellemeleri, realtimeHedefAboneliktenCik } from './stores/hedefStore';
import { getSiteConfig, subscribeSiteConfig } from './config/site';
import { isSupabaseReady } from './lib/supabase';
import { bildirimKontrolunuBaslat, bildirimKontrolunuDurdur } from './stores/notificationStore';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const HedefTakvim = lazy(() => import('./pages/HedefTakvim'));
const AdaList = lazy(() => import('./pages/AdaList'));
const AdaDetail = lazy(() => import('./pages/AdaDetail'));
const BlokDetail = lazy(() => import('./pages/BlokDetail'));
const ReportAdd = lazy(() => import('./pages/ReportAdd'));
const ReportList = lazy(() => import('./pages/ReportList'));
const Personnel = lazy(() => import('./pages/Personnel'));
const Profile = lazy(() => import('./pages/Profile'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Hakedis = lazy(() => import('./pages/Hakedis'));
const Settings = lazy(() => import('./pages/Settings'));
const NewSantiyeWizard = lazy(() => import('./pages/NewSantiyeWizard'));
const Login = lazy(() => import('./pages/Login'));

function PageLoader() {
  return (
    <div style={{ padding: 24, color: 'var(--text-faint)', fontSize: 14 }}>Yükleniyor...</div>
  );
}

function TitleUpdater() {
  const config = useSyncExternalStore(subscribeSiteConfig, getSiteConfig);
  useEffect(() => {
    document.title = config.marka.appName || 'Şantiye Takip';
  }, [config.marka.appName]);
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function PmRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  if (!isProjeMuduruSession()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

const isNative = Capacitor.isNativePlatform();
const AppRouter = isNative ? HashRouter : BrowserRouter;

function resolveAppBasename(): string | undefined {
  if (isNative) return undefined;
  const cfgBase = getSiteConfig().marka.webBasename.replace(/^\/+|\/+$/g, '');
  if (!cfgBase) return '/';
  const path = window.location.pathname;
  return path === '/' + cfgBase || path.startsWith('/' + cfgBase + '/')
    ? '/' + cfgBase
    : '/';
}

// GitHub Pages gibi alt dizin yayinlarinda kok pathname trailing slash'siz
// kalirsa goreli kaynak yollari (manifest, ikonlar) site kokune cozulur.
// AppRouter icinde calismasi gerektigi icin ayri bir bilesendir.
function TrailingSlashDuzenle() {
  const location = useLocation();
  useEffect(() => {
    if (isNative) return;
    const base = resolveAppBasename();
    if (base && base !== '/' && location.pathname === base) {
      window.history.replaceState(null, '', base + '/');
    }
  }, [location.pathname]);
  return null;
}

export default function App() {
  const [authTick, setAuthTick] = useState(0);

  useEffect(() => { supabaseAuthInit(); }, []);
  useEffect(() => subscribeAuthChanges(() => setAuthTick(t => t + 1)), []);

  useEffect(() => {
    if (!isLoggedIn() || !isSupabaseReady()) return;

    const sonGorunurRefetch = { zaman: 0 };
    const sonHataRefetch = { zaman: 0 };

    const tumunuYukle = () => {
      Promise.all([
        supabaseRaporlariYukle(),
        supabaseAtamalariYukle(),
        supabaseKullanicilariYukle(),
        supabaseHedefleriYukle(),
      ]);
    };

    const gorunurRefetch = () => {
      const simdi = Date.now();
      if (simdi - sonGorunurRefetch.zaman < 5 * 60 * 1000) return;
      sonGorunurRefetch.zaman = simdi;
      tumunuYukle();
    };

    const hataRefetch = (status: string) => {
      if (status !== 'CHANNEL_ERROR' && status !== 'CLOSED') return;
      const simdi = Date.now();
      if (simdi - sonHataRefetch.zaman < 30 * 1000) return;
      sonHataRefetch.zaman = simdi;
      tumunuYukle();
    };

    tumunuYukle();

    aboneOlRaporGuncellemeleri(hataRefetch);
    aboneOlAtamaGuncellemeleri(hataRefetch);
    aboneOlHedefGuncellemeleri(hataRefetch);
    bildirimKontrolunuBaslat();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        gorunurRefetch();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleOnline = () => gorunurRefetch();
    window.addEventListener('online', handleOnline);

    return () => {
      realtimeRaporAboneliktenCik();
      realtimeAtamaAboneliktenCik();
      realtimeHedefAboneliktenCik();
      bildirimKontrolunuDurdur();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [authTick]);

  return (
    <AppRouter basename={resolveAppBasename()}>
      <TrailingSlashDuzenle />
      <ErrorBoundary>
        <>
          <TitleUpdater />
          <Toast />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/hedef-takvim" element={<HedefTakvim />} />
                        <Route path="/adalar" element={<AdaList />} />
                        <Route path="/ada/:ada" element={<AdaDetail />} />
                        <Route path="/ada/:ada/blok/:blokNo" element={<BlokDetail />} />
                        <Route path="/rapor-ekle" element={<ReportAdd />} />
                        <Route path="/raporlar" element={<ReportList />} />
                        <Route path="/personel" element={<Personnel />} />
                        <Route path="/toplu-rapor" element={<Navigate to="/rapor-ekle" replace />} />
                        <Route path="/profil" element={<Profile />} />
                        <Route path="/istatistik" element={<Statistics />} />
                        <Route path="/hakedis" element={<Hakedis />} />
                        <Route path="/ayarlar" element={<PmRoute><Settings /></PmRoute>} />
                        <Route path="/yeni-santiye" element={<PmRoute><NewSantiyeWizard /></PmRoute>} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </>
      </ErrorBoundary>
    </AppRouter>
  );
}
