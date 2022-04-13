import { from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class RedisCacheService {
  constructor(@Inject('CACHE_MANAGER') private cacheManager) {}

  public async set(key: string, value: string | number, ttl: number): Promise<string> {
    return from(this.cacheManager.set(key, value, { ttl }))
      .pipe(
        map((res: string) => res),
        catchError((err) => throwError(new HttpException(err.message, HttpStatus.BAD_REQUEST))),
      )
      .toPromise();
  }

  public async get(key: string): Promise<string> {
    return from(this.cacheManager.get(key))
      .pipe(
        map((res: string) => res),
        catchError((err) => throwError(new HttpException(err.message, HttpStatus.BAD_REQUEST))),
      )
      .toPromise();
  }

  public async delete(key: string): Promise<void> {
    try {
      this.cacheManager.del(key);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  public async hasKey(key: string): Promise<boolean> {
    return from(this.cacheManager.keys(key))
      .pipe(
        map((res: string[]) => Boolean(res.length)),
        catchError((err) => throwError(new HttpException(err.message, HttpStatus.BAD_REQUEST))),
      )
      .toPromise();
  }
}
