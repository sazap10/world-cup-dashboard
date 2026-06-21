import { defineConfig } from 'vitest/config';

// Standalone from vite.config.ts so tests don't load the football-data feed
// cache plugin (which expects a server runtime). Pure unit tests over src/.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
