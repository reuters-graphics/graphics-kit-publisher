import { HTTPError, ServerError } from '../exceptions/errors';
import axios, { type AxiosRequestConfig } from 'axios';

import axiosRetry from 'axios-retry';
import { has } from 'es-toolkit/compat';

axiosRetry(axios, {
  retries: 3,
  retryDelay: (i) => i * 2000,
});

/**
 * Catch and format a useful error message from RNGS or Axios
 * @param e Error
 * @returns Error
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const catchGraphicsServerError = (e: any) => {
  // RNGS errors
  if (has(e, 'response.data.errors')) {
    const errorMessage = e.response.data.errors
      .map((e: { error_description: string }) => e.error_description)
      .join('; ');
    return new ServerError(`Error(s): ${errorMessage}`);
  }
  if (has(e, 'response.data.error_description')) {
    const errorMessage = e.response.data.error_description;
    return new ServerError(`Error: ${errorMessage}`);
  }
  if (has(e, 'errorMessage')) {
    const errorMessage = e.errorMessage;
    return new ServerError(`Error: ${errorMessage}`);
  }
  // Axios error
  if (axios.isAxiosError(e)) {
    return new HTTPError(
      `${e.response?.status || 'UNKNOWN'} ${e.request.method} ERROR at ${
        e.request.url
      }`
    );
  }
  return e;
};

export const POST = async <T>(
  path: string,
  postData: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  config: AxiosRequestConfig
) => {
  try {
    return axios.post<T>(path, postData, config);
  } catch (error) {
    throw catchGraphicsServerError(error);
  }
};
