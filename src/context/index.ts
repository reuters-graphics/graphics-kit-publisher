import { defaultConfig, validateConfig, type Config } from '../config';
import fs from 'fs';
import path from 'path';
import { LocationError } from '../exceptions/errors';
import { detectSync } from 'package-manager-detector/detect';
import type { DetectResult } from 'package-manager-detector';

export class Context {
  private static instance: Context;
  private _config: Config = defaultConfig;
  public cwd: string;
  /**
   * Project package manager
   */
  public pkgMgr: DetectResult | null;
  public static getInstance(): Context {
    if (!Context.instance) Context.instance = new Context();
    return Context.instance;
  }

  private constructor() {
    this.cwd = this._validateCWD();
    this.pkgMgr = detectSync();
  }

  private _validateCWD() {
    const cwd = process.cwd();
    if (!fs.existsSync(path.join(cwd, 'package.json'))) {
      throw new LocationError('Must run publisher from project root');
    }
    return cwd;
  }

  get config() {
    return this._config;
  }

  set config(config: Config) {
    validateConfig(config);
    this._config = config;
  }
}

/** The {@link Context} singleton. */
export const context = Context.getInstance();
