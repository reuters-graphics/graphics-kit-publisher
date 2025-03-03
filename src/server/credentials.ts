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
  } catch {
    throw new ServerCredentialsError('Invalid graphics server credentials');
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
      `Can't find graphics server credentials file ${picocolors.yellow('~/.reuters-graphics/graphics-server.json')}`
    );
  }
  return validate(fs.readJsonSync(credFilePath));
};
