import os from 'os';
import path from 'path';

const getCredentialsAPI = () => {
  const { SPHINX_ENV: env } = process.env;
  if (env === 'TEST') return 'https://api.sphinx-test.thomsonreuters.com';
  if (env === 'UAT') return 'https://api.sphinx-uat.thomsonreuters.com';
  if (env === 'CI') return 'https://api.sphinx-ci.int.thomsonreuters.com';
  return 'https://api.sphinx.thomsonreuters.com';
};

export const CREDENTIALS_API = getCredentialsAPI();

export const TEMP_SERVER_TOKEN_PATH = path.join(
  os.homedir(),
  '.reuters-graphics/.temp-server-token.json'
);
