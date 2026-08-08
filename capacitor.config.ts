import { CapacitorConfig } from '@capacitor/cli';
import { readFileSync } from 'node:fs';

// appId/appName data/santiye.config.json icindeki marka bolumunden gelir.
// cap CLI proje kokunden calistigi icin gozeli yol kullanilir.
function markaFromConfig() {
  try {
    const cfg = JSON.parse(readFileSync('data/santiye.config.json', 'utf8'));
    return cfg.marka ?? {};
  } catch {
    return {};
  }
}

const marka = markaFromConfig();

const config: CapacitorConfig = {
  appId: marka.capacitorAppId || 'com.santiyem.app',
  appName: marka.appName || 'Santiye Takip',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
};

export default config;
