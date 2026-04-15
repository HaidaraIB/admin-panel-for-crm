import path from 'path';
import type { Plugin } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function silenceBrowserConsoleInProd(mode: string): Plugin {
  return {
    name: 'silence-browser-console-prod',
    transformIndexHtml(html) {
      if (mode !== 'production') return html;
      const snippet =
        '<script>(function(){var n=function(){};var c=window.console||{};' +
        'c.log=c.info=c.debug=c.trace=c.dir=c.dirxml=c.group=c.groupCollapsed=c.groupEnd=c.table=c.time=c.timeEnd=c.timeLog=c.clear=c.count=c.countReset=c.assert=c.warn=c.error=n;})();</script>';
      return html.replace(/<head(\s[^>]*)?>/i, (m) => m + snippet);
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      esbuild: {
        drop: mode === 'production' ? (['console', 'debugger'] as const) : [],
      },
      server: {
        port: 3001,
        host: '0.0.0.0',
      },
      plugins: [silenceBrowserConsoleInProd(mode), react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom', 'react-router-dom'],
              'vendor-ui': ['recharts'],
            },
            chunkFileNames: 'assets/[name]-[hash].js',
            entryFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]',
          },
        },
        chunkSizeWarningLimit: 600,
      },
    };
});
