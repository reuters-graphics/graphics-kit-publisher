import fs from 'fs-extra';
import ogs from 'open-graph-scraper';

export default async(localFilePath) => {
  const html = fs.readFileSync(localFilePath, 'utf-8');
  return new Promise((resolve, reject) => {
    ogs({ html })
      .then((data) => {
        const { error, result } = data;
        if (error) reject(error);
        resolve(result);
      });
  });
};
