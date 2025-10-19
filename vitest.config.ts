import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Enable globals so we don't need to import describe/it/expect
    globals: true,

    // Environment (jsdom for DOM APIs, node for pure JS)
    environment: 'node',

    // Test file patterns
    include: ['tests/**/*.test.ts'],

    // Coverage settings (optional)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/**/*.d.ts']
    },

    // TypeScript support
    typecheck: {
      enabled: false // Can enable for type checking tests
    },

    // Pool options to avoid vite transform
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  },

  esbuild: {
    target: 'es2020'
  }
});
