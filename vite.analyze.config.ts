import { defineConfig } from 'vite';
import baseConfig from './vite.config';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  ...baseConfig,
  plugins: [
    ...(Array.isArray(baseConfig.plugins) ? baseConfig.plugins : []),
    visualizer({ open: false, filename: 'dist/stats.html', gzipSize: true, brotliSize: true }),
  ],
});
