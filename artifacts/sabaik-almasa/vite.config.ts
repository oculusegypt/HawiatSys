import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT || '19770';
const port = Number(rawPort) || 19770;
const basePath = process.env.BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@workspace/api-client-react': path.resolve(import.meta.dirname, '../../lib/api-client-react/src'),
      '@workspace/api-zod': path.resolve(import.meta.dirname, '../../lib/api-zod/src'),
      '@workspace/db': path.resolve(import.meta.dirname, '../../lib/db/src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // خرائط Leaflet — كبيرة ومستقلة
          if (id.includes('leaflet')) return 'vendor-leaflet';
          // الرسوم البيانية
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('d3/')) return 'vendor-charts';
          // الحركة
          if (id.includes('framer-motion')) return 'vendor-motion';
          // محرر النصوص TipTap
          if (id.includes('@tiptap')) return 'vendor-editor';
          // مكونات Radix UI
          if (id.includes('@radix-ui')) return 'vendor-radix';
          // React core
          if (id.includes('react-dom') || id.includes('react/') || id.includes('scheduler')) return 'vendor-react';
          // مكتبات نماذج وتحقق
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) return 'vendor-forms';
          // الأيقونات
          if (id.includes('lucide-react')) return 'vendor-icons';
          // مكتبات التاريخ والمساعدة
          if (id.includes('date-fns') || id.includes('clsx') || id.includes('class-variance') || id.includes('tailwind-merge')) return 'vendor-utils';
        }
      }
    }
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
