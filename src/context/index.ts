import { defaultConfig, validateConfig, type Config } from '../config';
import { detectSync } from 'package-manager-detector/detect';
import type { DetectResult } from 'package-manager-detector';

export class Context {
  private static instance: Context;
  private _config: Config = defaultConfig;
  private _cwd?: string;
  private _pkgMgr?: DetectResult | null;
  public static getInstance(): Context {
    if (!Context.instance) Context.instance = new Context();
    return Context.instance;
  }

  /**
   * Project root.
   *
   * Read through rather than cached so it always reflects the current working
   * directory, and resolved lazily so importing the publisher never touches the
   * filesystem — the constructor used to check for a `package.json` here, which
   * meant a library consumer (or a test) could get a `LocationError` thrown at
   * import time, before anything could render it. Commands get that check from
   * `loadUserConfig`, which throws `NOT_PROJECT_ROOT` inside the CLI's error
   * handling.
   *
   * @see https://github.com/reuters-graphics/graphics-kit-publisher/issues/133
   */
  get cwd() {
    return this._cwd ?? process.cwd();
  }

  set cwd(cwd: string) {
    this._cwd = cwd;
  }

  /**
   * Project package manager. Detection walks the directory tree, so it's
   * deferred until something asks and then cached.
   */
  get pkgMgr() {
    if (this._pkgMgr === undefined) this._pkgMgr = detectSync() ?? null;
    return this._pkgMgr;
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
