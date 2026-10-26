import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src'), 'virtual:pwa-register': path.resolve(__dirname, './src/test/pwaRegisterStub.ts') } },
  test: {
    clearMocks: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
