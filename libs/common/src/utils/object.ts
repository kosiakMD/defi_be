export const filterObjectKeys = (
  obj: Record<string, any>,
  filter: (arg: any) => boolean,
): Record<string, any> =>
  Object.fromEntries(
    Object.entries(obj).filter((x) => {
      return filter(x[0]);
    }),
  );

export function groupBy(list: any, keyGetter: any): Map<any, any> {
  const map = new Map();
  list.forEach((item: any) => {
    const key = keyGetter(item);
    const collection = map.get(key);
    if (!collection) {
      map.set(key, [item]);
    } else {
      collection.push(item);
    }
  });
  return map;
}

export const mapToObject = <T extends Map<string, any>>(mapInstance: T): Record<string, any> =>
  [...mapInstance.entries()].reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

export const objectToMap = (objectInstance: Record<string, any>): Map<string, any> =>
  new Map(Object.entries(objectInstance));
