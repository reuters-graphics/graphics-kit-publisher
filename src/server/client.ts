import { ServerClient } from '@reuters-graphics/server-client';
import { getServerCredentials } from './credentials';
import { Token } from './token';

export const getServerClient = (pack: null | string = null) => {
  const { username, password, apiKey } = getServerCredentials();
  const getToken = async () => {
    const token = new Token({ username, password, apiKey });
    return token.getToken();
  };
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
        getToken,
      })
    : new ServerClient({
        username,
        password,
        apiKey,
        logging: {
          level: 'error',
          color: true,
        },
        getToken,
      });
};
