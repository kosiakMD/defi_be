// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Cache } from 'cache-manager';

// import { Redis } from "ioredis";

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
      const cache: Cache = this.cache;
      // const logge__r: Logger = this.logge__r;

      // for debug reason only
      {
        let r = rMap.get(key) || 0;
        r++;
        console.log('__refetch', key, r);
        rMap.set(key, r);
      }

      // console.log('__cache: ', cache);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // const redis: Redis = cache.store.getClient();
      // console.log('__getClient: ', redis);

      // const incr = await redis.incr(key);
      // console.log('__incr:', incr);
      // const current = await redis.call('incr', key);
      // console.log('__current:', current);
      // console.log('__keys', await cache.store.keys());
      // console.log('__', await cache.set(key, 0));
      const count = Number((await cache.get(key)) || 0);
      console.log('__count before', key, count);
      // delaying in the loop if bus is busy, 200ms by default
      if (count >= limitPerSec) {
        console.log('__delaying', limitPerSec);
        return new Promise((r) => setTimeout(() => r(method.apply(this, args)), retryInSec));
      } else {
        console.log('__incrementing');
        await cache.set(key, count + 1, { ttl: ttlInSec });
      }

      try {
        console.log('__trying');
        return await method.apply(this, args);
      } finally {
        const count = Number((await cache.get(key)) || 0);
        console.log('__count after 2', key, count);
        // const nextCount = count ? count - 1 : 0;
        const nextCount = 1;
        console.log('__nextCount', nextCount);
        rMap.set(key, 0);
        await cache.set(key, nextCount, { ttl: ttlInSec });
      }
    };

    return propertyDescriptor;
  };
};
