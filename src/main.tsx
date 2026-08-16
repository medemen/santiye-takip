import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { getTemaSecim, temaSeciminiUygula } from './stores/themeStore'

getTemaSecim()
temaSeciminiUygula()

// Alt dizin yayinlarinda (GitHub Pages) gecici trailing-slash'siz URL'lerde
// goreli ikon/manifest yollari site kokune cozulur; bu yuzden link'ler
// ilk yuklemede mutlak URL'e cevrilir.
for (const el of Array.from(document.querySelectorAll('link[rel="manifest"], link[rel="icon"], link[rel="apple-touch-icon"]'))) {
  const href = el.getAttribute('href')
  if (href && !href.startsWith('http')) {
    el.setAttribute('href', new URL(href, document.baseURI).href)
  }
}

function hataGoster(msg: string) {
  const root = document.getElementById('root')
  if (!root || root.childElementCount > 0) return
  root.innerHTML =
    '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80dvh;padding:40px;text-align:center;font-family:sans-serif">' +
    '<div style="font-size:48px;margin-bottom:12px">⚠️</div>' +
    '<h2 style="font-size:18px;font-weight:700;color:#1f2937;margin-bottom:8px">Bir hata oluştu</h2>' +
    '<p style="font-size:13px;color:#6b7280;word-break:break-word">' + msg + '</p>' +
    '</div>'
}

window.addEventListener('error', (e) => hataGoster(e.message || 'Bilinmeyen hata'))
window.addEventListener('unhandledrejection', (e) => hataGoster(String(e.reason)))

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', document.baseURI).href).catch(() => {
      /* SW kaydi basarisiz olursa uygulama normal sekilde devam eder */
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
