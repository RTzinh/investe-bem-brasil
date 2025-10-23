import { defineConfig } from 'vitest/config';

process.env.SERVER_API_KEY = process.env.SERVER_API_KEY ?? 'Rn77sv5rxZMkhHRz';
process.env.SQLITE_PATH = process.env.SQLITE_PATH ?? ':memory:';
process.env.SEED_SAMPLE_DATA = 'false';
process.env.FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL ?? 'http://localhost:8000/api/v1';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['server/src/**/*.ts'],
      exclude: ['server/src/index.ts'],
    },
  },
});

