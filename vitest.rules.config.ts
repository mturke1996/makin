import { defineConfig } from 'vitest/config';

/** Security-rules tests need the Firestore emulator: run them with `npm run test:rules`. */
export default defineConfig({
  test: {
    clearMocks: false,
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
