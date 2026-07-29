import { coverageConfigDefaults, defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    /**
     * Each test file runs in its own real temp project directory, which the
     * setup file enters with `process.chdir` — that throws in worker threads,
     * so tests need a process per file. This is Vitest's default; it's pinned
     * to document the dependency.
     *
     * @see src/__test__/project.ts
     */
    pool: 'forks',
    coverage: {
      include: ['src/**'],
      reporter: ['text', 'json', 'html'],
      exclude: ['src/cli.ts', ...coverageConfigDefaults.exclude],
    },
    exclude: [
      'src/__archive__/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
    ],
    setupFiles: './vitest.setup.ts',
  },
});
