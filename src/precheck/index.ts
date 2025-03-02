import { checkImages } from './checkImages';
import { checkInvalidfiles } from './checkInvalidFiles';

export const precheck = async () => {
  checkInvalidfiles();
  await checkImages();
};
