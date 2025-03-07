import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['src/index.ts', 'src/cli.ts'],
  project: ['src/**/*.ts'],
};

export default config;
