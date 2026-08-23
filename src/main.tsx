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
  // innerHTML yerine DOM API: hata mesaji guvenilmez kaynaklardan gelebilir
  const kutu = document.createElement('div')
  kutu.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80dvh;padding:40px;text-align:center;font-family:sans-serif'
  const ikon = document.createElement('div')
  ikon.style.cssText = 'font-size:48px;margin-bottom:12px'
  ikon.textContent = '⚠️'
  const baslik = document.createElement('h2')
  baslik.style.cssText = 'font-size:18px;font-weight:700;color:#1f2937;margin:0 0 8px'
  baslik.textContent = 'Bir hata oluştu'
  const aciklama = document.createElement('p')
  aciklama.style.cssText = 'font-size:13px;color:#6b7280;word-break:break-word;margin:0'
  aciklama.textContent = msg
  kutu.append(ikon, baslik, aciklama)
  root.replaceChildren(kutu)
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
