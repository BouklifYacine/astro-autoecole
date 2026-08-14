import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * The `@/` alias has to be declared here too: vitest does not read tsconfig paths,
 * and without it every module importing `@/config/site.config` fails to resolve.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
