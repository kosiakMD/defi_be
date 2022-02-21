// eslint-disable-next-line @typescript-eslint/no-unused-vars

const rMap = new Map();

export const ClusterThrottling = function <T = any>(
  key: string,
  limitPerSec: number,
  ttlInSec: number,
  retryInSec = 200,
) {
  return function (
    target: any,
    propertyKey: string,
    propertyDescriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const method = propertyDescriptor.value;

    propertyDescriptor.value = async function (...args: any): Promise<T> {
      // const logger: Logger = this.logger;

      // for debug reason only
      {
        let r = rMap.get(key) || 0;
        r++;
        console.log('refetch', r);
        rMap.set(key, r);
      }

      const count = Number((await this.cache.get(key)) || 0);
      console.log('count', count);
      if (count >= limitPerSec) {
        return new Promise((r) => setTimeout(() => r(method.apply(this, args)), retryInSec));
      } else {
        await this.cache.set(key, count + 1, { ttl: ttlInSec });
      }

      try {
        return await method.apply(this, args);
      } finally {
        const count = Number((await this.cache.get(key)) || 0);
        console.log('count2', count);
        // const nextCount = count ? count - 1 : 0;
        const nextCount = 1;
        console.log('nextCount', nextCount);
        rMap.set(key, 0);
        await this.cache.set(key, nextCount, { ttl: ttlInSec });
      }
    };

    return propertyDescriptor;
  };
};
