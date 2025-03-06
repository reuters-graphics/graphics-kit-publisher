import os from 'os';
import path from 'path';

const getCredentialsAPI = () => {
  const { SPHINX_ENV: env } = process.env;
  if (env === 'TEST') return 'https://api.sphinx-test.thomsonreuters.com';
  if (env === 'UAT') return 'https://api.sphinx-uat.thomsonreuters.com';
  if (env === 'CI') return 'https://api.sphinx-ci.int.thomsonreuters.com';
  return 'https://api.sphinx.thomsonreuters.com';
};

const getGraphicsAPI = () => {
  const { SPHINX_ENV: env } = process.env;
  if (env === 'TEST')
    return 'https://api-test.graphics-sphinx-nonprod.thomsonreuters.com';
  if (env === 'UAT')
    return 'https://api.graphics-sphinx-uat.thomsonreuters.com';
  if (env === 'CI')
    return 'https://api-ci.graphics-sphinx-nonprod.thomsonreuters.com';
  return 'https://api.graphics-sphinx.thomsonreuters.com';
};

export const CREDENTIALS_API = getCredentialsAPI();
export const GRAPHICS_API = getGraphicsAPI();
export const TEMP_SERVER_TOKEN_PATH = path.join(
  os.homedir(),
  '.reuters-graphics/.temp-server-token.json'
);
