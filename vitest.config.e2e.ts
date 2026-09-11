import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  test: {
    include: ['**/*.e2e-spec.ts'],
    globals: true,
    root: './',
    setupFiles: ['./test/setup-e2e.ts'],
    // e2e compartilha um único banco de teste — sem paralelismo entre arquivos
    // para os beforeEach de limpeza não colidirem entre si.
    fileParallelism: false,
  },
  plugins: [swc.vite()],
});
