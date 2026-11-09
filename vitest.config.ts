import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/rules/**/*.ts', 'src/server/**/*.ts', 'src/client/eventQueue.ts'],
      exclude: [
        '**/*.test.ts',
        'src/server/main.ts',
        'src/server/testing.ts',
        'src/rules/testing.ts',
      ],
      thresholds: { branches: 90 },
    },
  },
});
