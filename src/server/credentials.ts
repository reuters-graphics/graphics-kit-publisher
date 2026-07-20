import { ServerCredentialsError, UserConfigError } from '../exceptions/errors';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { utils } from '@reuters-graphics/graphics-bin';
import picocolors from 'picocolors';
import * as v from 'valibot';

const ServerCredsSchema = v.required(
  v.object({
    username: v.pipe(v.string(), v.minLength(3)),
    password: v.pipe(v.string(), v.minLength(3)),
    apiKey: v.pipe(v.string(), v.minLength(20)),
  })
);

type ServerCreds = v.InferInput<typeof ServerCredsSchema>;

const validate = (creds: ServerCreds) => {
  try {
    v.parse(ServerCredsSchema, creds);
  } catch (cause) {
    // Only field NAMES go in context — never the credential values.
    const missingFields = Object.entries(creds ?? {})
      .filter(([, value]) => !value)
      .map(([key]) => key);
    throw new ServerCredentialsError('Invalid graphics server credentials', {
      code: 'INVALID_SERVER_CREDENTIALS',
      hint: 'Check your username, password, and API key for the graphics server.',
      context: { missingFields },
      cause,
    });
  }
  return creds;
};

export const getServerCredentials = () => {
  // For serverless environments, use env vars...
  if (utils.environment.isCiEnvironment()) {
    return validate({
      username: process.env.GRAPHICS_SERVER_USERNAME!,
      password: process.env.GRAPHICS_SERVER_PASSWORD!,
      apiKey: process.env.GRAPHICS_SERVER_API_KEY!,
    });
  }
  const credFilePath = path.join(
    os.homedir(),
    '.reuters-graphics/graphics-server.json'
  );
  if (!fs.existsSync(credFilePath)) {
    throw new UserConfigError(
      `Can't find graphics server credentials file ${picocolors.cyan('~/.reuters-graphics/graphics-server.json')}`,
      {
        code: 'MISSING_CREDENTIALS_FILE',
        hint: 'Create the credentials file at ~/.reuters-graphics/graphics-server.json with your server username, password, and API key.',
        context: { credFilePath },
      }
    );
  }
  return validate(fs.readJsonSync(credFilePath));
};
