import fs from 'fs';

import { RootPlatform } from '../support/RootPlatform';

const getPlatforms = async (platformsToExclude: string[]) => {
  const exclude = new Set(platformsToExclude);
  const files = fs.readdirSync(__dirname);
  const promises = files
    .filter((file) => {
      return !exclude.has(file.split('.')[0]);
    })
    .map((file) => {
      return import(`./${file.split('.')[0]}`);
    });
  return (await Promise.all(promises)).reduce((acc, curr) => {
    const [platform]: any[] = Object.values(curr);
    if (platform.prototype instanceof RootPlatform) {
      Object.assign(acc, curr);
    }
    return acc;
  }, {});
};

export default getPlatforms;
