import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['src/index.ts', 'src/cli.ts'],
  project: ['src/**/*.ts'],
  // Temporary
  ignore: ['src/config/package.ts', 'src/prompts/multiselect.ts'],
};

export default config;
