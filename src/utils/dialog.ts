import { Capacitor } from '@capacitor/core';
import { Dialog } from '@capacitor/dialog';

// WebView (Android) window.confirm/prompt'u desteklemez; native'de
// @capacitor/dialog kullanilir, web'de tarayici dialogu korunur.
export async function onayla(mesaj: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const sonuc = await Dialog.confirm({ title: 'Onay', message: mesaj });
    return sonuc.value;
  }
  return window.confirm(mesaj);
}

export async function metinIste(mesaj: string): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    const sonuc = await Dialog.prompt({ title: 'Bilgi', message: mesaj });
    return sonuc.value;
  }
  return window.prompt(mesaj);
}
