import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
