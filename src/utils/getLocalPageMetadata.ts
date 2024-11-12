import fs from 'fs-extra';
import ogs from 'open-graph-scraper';

type OpenGraphScraped = ogs.OpenGraphProperties & {
  ogImage?: { url: string }[] | { url: string };
  success: true;
};

/**
 * Gets metadata in a local HTML page
 */
export default async (localFilePath: string): Promise<OpenGraphScraped> => {
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
