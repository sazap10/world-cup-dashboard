import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Read FOOTBALL_DATA_TOKEN from .env without exposing it to the client bundle
  // (only VITE_-prefixed vars reach the browser).
  const env = loadEnv(mode, process.cwd(), '');
  const token = env.FOOTBALL_DATA_TOKEN ?? '';

  return {
    plugins: [react()],
    server: {
      // Same-origin proxy so the browser never sees the API token and CORS is
      // a non-issue. The app calls "/fd/v4/...", we forward to football-data.org.
      proxy: {
        '/fd': {
          target: 'https://api.football-data.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/fd/, ''),
          headers: token ? { 'X-Auth-Token': token } : {},
        },
      },
    },
  };
});
