export const filterObjectKeys = (
  obj: Record<string, any>,
  filter: (arg: any) => boolean,
): Record<string, any> =>
  Object.fromEntries(
    Object.entries(obj).filter((x) => {
      return filter(x[0]);
    }),
  );

export function groupBy<T, K = string>(list: T[], keyExtractor: (t: T) => K): Map<K, T[]> {
  const map = new Map();
  list.forEach((item) => {
    const key = keyExtractor(item);
    const collection = map.get(key);
    if (!collection) {
      map.set(key, [item]);
    } else {
      collection.push(item);
    }
  });
  return map;
}

/**
 *
 * @param arrayOfObjects [{ fuu: 100, lol: 200, bar: 50 },
 *                        { fuu: 100, lol: 200, bar: 50 }]
 * @param baseProperties ['fuu', 'bar']
 * @param outputProperties ['foo', 'baz']
 * @returns `{ foo: 150, baz: 100 }`
 */
export const sumOfProperties = <T = { [basePropertyName: string]: unknown }>(
  arrayOfObjects: T[],
  baseProperties: string[],
  outputProperties: string[],
): { [outputPropertyName: string]: number } =>
  arrayOfObjects.reduce(
    (previousObject, currentObject) => {
      outputProperties.forEach((propertyName, index) => {
        previousObject[propertyName] += Number(currentObject[baseProperties[index]]) || 0;
      });

      return previousObject;
    },
    outputProperties.reduce((prev, next) => ({ ...prev, [next]: 0 }), {}),
  );

export const mapToObject = <T extends Map<string, any>>(mapInstance: T): Record<string, any> =>
  Object.fromEntries(mapInstance.entries());

export const objectToMap = (objectInstance: Record<string, any>): Map<string, any> =>
  new Map(Object.entries(objectInstance));

export const sortKeys = <T extends { [k: string]: unknown }>(obj: T): T => {
  const a = Object.entries(obj);
  return Object.fromEntries(a) as T;
};
