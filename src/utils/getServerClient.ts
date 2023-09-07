import ServerClient from '@reuters-graphics/server-client';
import getServerCredentials from './getServerCredentials';

export default (pack: null | string = null) => {
  const { username, password, apiKey } = getServerCredentials();
  return pack
    ? new ServerClient({
        username,
        password,
        apiKey,
        graphic: {
          id: pack,
        },
      })
    : new ServerClient({
        username,
        password,
        apiKey,
      });
};
