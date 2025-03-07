import { globSync } from 'glob';
import { zipObject } from 'es-toolkit';
import path from 'node:path';
import mock from 'mock-fs';

const __dirname = import.meta.dirname;

const nodeModuleDeps = globSync('*/', {
  cwd: path.resolve(__dirname, '../../node_modules'),
  absolute: true,
});

/**
 * Mocked node_modules, excluding .pnpm and other dot directories
 * that don't play nicely with mock-fs
 */
export const mockedNodeModules = zipObject(
  nodeModuleDeps,
  nodeModuleDeps.map((d) => mock.load(d))
);
