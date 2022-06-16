import fs from 'fs';

const exclude = new Set(['index.ts', 'LimeSwap.ts']);

export default (async () => {
  const files = fs.readdirSync('apps/integration/src/framework/platforms');
  const promises = files
    .filter((file) => !exclude.has(file))
    .map((file) => {
      return import(`./${file.split('.')[0]}`);
    });
  return (await Promise.all(promises)).reduce((acc, curr) => {
    Object.assign(acc, curr);
    return acc;
  }, {});
})();
