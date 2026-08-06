import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Toast from './components/Toast';
import { isLoggedIn, isAdmin, supabaseAuthInit, subscribeAuthChanges } from './stores/authStore';
import { supabaseRaporlariYukle, aboneOlRaporGuncellemeleri, realtimeRaporAboneliktenCik } from './stores/reportStore';
import { supabaseFotolariYukle } from './stores/fotoStore';
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
const BulkReport = lazy(() => import('./pages/BulkReport'));
const Personnel = lazy(() => import('./pages/Personnel'));
const Profile = lazy(() => import('./pages/Profile'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Settings = lazy(() => import('./pages/Settings'));
const NewSantiyeWizard = lazy(() => import('./pages/NewSantiyeWizard'));
const Login = lazy(() => import('./pages/Login'));

function PageLoader() {
  return (
    <div style={{ padding: 24, color: '#6b7280', fontSize: 14 }}>Yükleniyor...</div>
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

function AdminRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

const isNative = Capacitor.isNativePlatform();
const AppRouter = isNative ? HashRouter : BrowserRouter;

export default function App() {
  const [authTick, setAuthTick] = useState(0);

  useEffect(() => { supabaseAuthInit(); }, []);
  useEffect(() => subscribeAuthChanges(() => setAuthTick(t => t + 1)), []);

  useEffect(() => {
    if (!isLoggedIn() || !isSupabaseReady()) return;

    Promise.all([
      supabaseRaporlariYukle(),
      supabaseAtamalariYukle(),
      supabaseKullanicilariYukle(),
      supabaseHedefleriYukle(),
      supabaseFotolariYukle(),
    ]);

    aboneOlRaporGuncellemeleri();
    aboneOlAtamaGuncellemeleri();
    aboneOlHedefGuncellemeleri();
    bildirimKontrolunuBaslat();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        supabaseRaporlariYukle();
        supabaseAtamalariYukle();
        supabaseHedefleriYukle();
        supabaseFotolariYukle();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      realtimeRaporAboneliktenCik();
      realtimeAtamaAboneliktenCik();
      realtimeHedefAboneliktenCik();
      bildirimKontrolunuDurdur();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [authTick]);

  return (
    <AppRouter basename={isNative ? undefined : getSiteConfig().marka.webBasename}>
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
                        <Route path="/personel" element={<AdminRoute><Personnel /></AdminRoute>} />
                        <Route path="/toplu-rapor" element={<AdminRoute><BulkReport /></AdminRoute>} />
                        <Route path="/profil" element={<Profile />} />
                        <Route path="/istatistik" element={<Statistics />} />
                        <Route path="/ayarlar" element={<AdminRoute><Settings /></AdminRoute>} />
                        <Route path="/yeni-santiye" element={<AdminRoute><NewSantiyeWizard /></AdminRoute>} />
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
