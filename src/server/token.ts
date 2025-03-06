import { CREDENTIALS_API, TEMP_SERVER_TOKEN_PATH } from './locations';

import { POST } from './http';
import { ServerError } from '../exceptions/errors';
import fs from 'fs';
import { isAxiosError } from 'axios';
import { jwtDecode } from 'jwt-decode';
import { cancel, isCancel, text } from '@clack/prompts';
import type { ServerSpinner } from './spinner';

interface ApiCredentials {
  username: string;
  password: string;
  apiKey: string;
}

export class Token {
  private credentials: ApiCredentials;
  constructor(credentials: ApiCredentials) {
    this.credentials = credentials;
  }

  private async _postToken(activeSpinner?: ServerSpinner): Promise<string> {
    const { username, password, apiKey } = this.credentials;
    const credentials = Buffer.from(`${username}:${password}`).toString(
      'base64'
    );
    const headers = { 'X-Api-Key': apiKey };

    try {
      const { data } = await POST<{ Token: string }>(
        `${CREDENTIALS_API}/auth/token`,
        { credentials },
        { headers }
      );
      const { Token } = data;
      return Token;
    } catch (err) {
      if (isAxiosError(err)) {
        if (err?.response?.status === 401) {
          const token = await this._promptForToken(activeSpinner);
          return token;
        }
      }
      throw err;
    }
  }

  private _readCachedTempToken() {
    if (!fs.existsSync(TEMP_SERVER_TOKEN_PATH)) return null;
    try {
      const tempToken = JSON.parse(
        fs.readFileSync(TEMP_SERVER_TOKEN_PATH, 'utf-8')
      );
      // Check if token is more than 15 minutes old
      if (
        new Date(tempToken.dateCreated).getTime() <
        Date.now() - 15 * 60 * 1000
      )
        return null;
      return tempToken.token;
    } catch {
      return null;
    }
  }

  private _writeCachedTempToken(token: string) {
    try {
      fs.writeFileSync(
        TEMP_SERVER_TOKEN_PATH,
        JSON.stringify({
          token,
          dateCreated: new Date(),
        })
      );
    } catch {
      // Handles file system write permissions...
    }
  }

  private async _promptForToken(activeSpinner?: ServerSpinner) {
    const tempToken = this._readCachedTempToken() as string | undefined;
    if (tempToken) return tempToken;
    if (activeSpinner) activeSpinner.pause();
    const token = await text({
      message:
        "Your server credentials don't have the correct permissions to publish graphics and may have expired.\n\nGet a temporary token from the graphics portal and paste it here:",
    });
    if (isCancel(token)) {
      cancel('Exiting publisher');
      process.exit(0);
    }
    this._writeCachedTempToken(token);
    if (activeSpinner) activeSpinner.resume();
    return token;
  }

  async validateToken(token: string, throwOnInvalid = false): Promise<string> {
    const { rights } = jwtDecode(token) as { rights: string[] };
    if (!rights) {
      throw new ServerError('Invalid API token. Token has no rights.');
    }

    /**
     * Test for "GFX_" rights, which indicates the token has rights
     * for the RNGS graphics server.
     */
    if (rights.some((right) => /^GFX_/.test(right))) {
      return token;
    }

    if (throwOnInvalid) {
      throw new ServerError(
        'Invalid API token. Token missing rights to publish to graphics server.'
      );
    }

    const promptedToken = await this._promptForToken();
    return this.validateToken(promptedToken, true);
  }

  /**
   * Get a token for the RNGS server API
   * @returns A validated API token
   */
  async getToken(activeSpinner?: ServerSpinner) {
    const token = await this._postToken(activeSpinner);
    return this.validateToken(token);
  }
}
