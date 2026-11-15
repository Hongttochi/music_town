import { defineConfig, loadEnv, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { createVoiceMiddleware } from './scripts/dev-voice-api.mjs';
import { resolve } from 'node:path';

// Serve policy documents before the SPA fallback, without starting authentication.
function legalDocuments(): Plugin {
  const install: NonNullable<Plugin['configureServer']> = (server) => {
    server.middlewares.use((req, _res, next) => {
      const url = new URL(req.url || '/', 'http://localhost');
      if (/^\/(privacy|terms|safety|admin)\/?$/.test(url.pathname)) {
        req.url = url.pathname.replace(/\/$/, '') + '/index.html' + url.search;
      }
      next();
    });
  };
  return { name: 'legal-documents', configureServer: install, configurePreviewServer: install };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    legalDocuments(),
    tailwindcss(),
    {
      name: 'dev-voice-api',
      configureServer(server) {
        server.middlewares.use(
          createVoiceMiddleware({ ...loadEnv(mode, process.cwd(), ''), ...process.env }),
        );
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html'),
      },
    },
  },
  server: {
    port: 5173,
    // Windows can temporarily lock newly copied image files (EBUSY).
    watch: { usePolling: true, interval: 500 },
  },
}));
