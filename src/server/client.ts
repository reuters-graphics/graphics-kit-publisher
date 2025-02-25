import { ServerClient } from '@reuters-graphics/server-client';
import { getServerCredentials } from './credentials';

export const getClient = (pack: null | string = null) => {
  const { username, password, apiKey } = getServerCredentials();
  return pack ?
      new ServerClient({
        username,
        password,
        apiKey,
        graphic: pack,
      })
    : new ServerClient({
        username,
        password,
        apiKey,
      });
};
