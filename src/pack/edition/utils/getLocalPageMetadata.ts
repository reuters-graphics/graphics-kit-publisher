import fs from 'fs-extra';
import ogs from 'open-graph-scraper';
import type { SuccessResult } from 'open-graph-scraper/types';

type OpenGraphScraped = SuccessResult['result'] & {
  ogImage?: { url: string }[] | { url: string };
  ogUrl?: string;
  success: true;
};

/**
 * Gets metadata in a local HTML page
 */
export const getLocalHTMLPageMetadata = async (
  localFilePath: string
): Promise<OpenGraphScraped> => {
  const html = fs.readFileSync(localFilePath, 'utf-8');
  return new Promise((resolve, reject) => {
    // @ts-ignore OK html
    ogs({ html }).then((data) => {
      const { error, result } = data;
      if (error) reject(error);
      resolve(result as OpenGraphScraped);
    });
  });
};
