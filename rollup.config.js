import externals from 'rollup-plugin-node-externals';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import { sizeSnapshot } from 'rollup-plugin-size-snapshot';

const plugins = [
  resolve({ preferBuiltins: true, modulesOnly: true }),
  json(),
  externals({ deps: true }),
  sizeSnapshot(),
];

const output = {
  dir: 'dist',
  format: 'cjs',
  paths: { '@reuters-graphics/graphics-kit-publisher': './index.js' },
};

export default [{
  input: 'src/index.js',
  output,
  plugins,
}, {
  input: 'src/cli.js',
  output: { ...output, ...{ banner: '#!/usr/bin/env node' } },
  plugins,
  external: ['@reuters-graphics/graphics-kit-publisher'],
}];
