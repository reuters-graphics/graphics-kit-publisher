import { ServerClient } from '@reuters-graphics/server-client';
import { getServerCredentials } from './credentials';

export const getServerClient = (pack: null | string = null) => {
  const { username, password, apiKey } = getServerCredentials();
  return pack ?
      new ServerClient({
        username,
        password,
        apiKey,
        graphic: pack,
        logging: {
          level: 'error',
          color: true,
        },
      })
    : new ServerClient({
        username,
        password,
        apiKey,
        logging: {
          level: 'error',
          color: true,
        },
      });
};
