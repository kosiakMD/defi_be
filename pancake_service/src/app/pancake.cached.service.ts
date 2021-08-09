import * as NodeCache from 'node-cache';

import { Injectable } from '@nestjs/common';

import { Pancake } from './interfaces/pancake.interface';
import { PancakesService } from './pancake.service';

const pancakesCache = new NodeCache();

@Injectable()
export class PancakesCachedService {
  constructor(private pancakesService: PancakesService) {}

  private pancakesCacheId = 'pancakes';
  private pancakesNextUpdateTs = 'pancakes-update-timestamp';
  private isPancakesLoadingLocked = 'is-pancakes-loading-locked';
  private pancakesCacheLive: number = 10 * 60 * 1000;

  public async getPancakes(): Promise<Pancake[]> {
    const pancakes: Pancake[] | undefined = pancakesCache.get<Pancake[]>(this.pancakesCacheId);
    const pancakesNextUpdateTs: number = pancakesCache.get<number>(this.pancakesNextUpdateTs);
    const isPancakesLoadingLocked: boolean = pancakesCache.get<boolean>(
      this.isPancakesLoadingLocked,
    );

    return this.getPancakesFromCache(pancakes, pancakesNextUpdateTs, isPancakesLoadingLocked);
  }

  private getPancakesFromCache(
    pancakes: Pancake[] | undefined,
    pancakesNextUpdateTs: number,
    isPancakesLoadingLocked: boolean,
  ): Pancake[] | [] {
    if (this.isFirstTimeLoad(pancakes, isPancakesLoadingLocked)) {
      this.loadPancakesToCache();
      return [];
    }
    if (this.isLoading(isPancakesLoadingLocked)) {
      return pancakes ?? [];
    }
    if (this.isCacheExpired(isPancakesLoadingLocked, pancakesNextUpdateTs)) {
      this.loadPancakesToCache();
    }

    return pancakes;
  }

  private isFirstTimeLoad(
    pancakes: Pancake[] | undefined,
    isPancakesLoadingLocked: boolean,
  ): boolean {
    return pancakes == undefined && !isPancakesLoadingLocked;
  }

  private isLoading(isPancakesLoadingLocked: boolean): boolean {
    return isPancakesLoadingLocked;
  }

  private isCacheExpired(isPancakesLoadingLocked: boolean, pancakesNextUpdateTs: number): boolean {
    return Date.now() > pancakesNextUpdateTs && isPancakesLoadingLocked == false;
  }

  private loadPancakesToCache(): void {
    pancakesCache.set(this.pancakesNextUpdateTs, Date.now() + this.pancakesCacheLive);
    pancakesCache.set(this.isPancakesLoadingLocked, true);

    this.pancakesService
      .getPancakes()
      .then((pancakes) => {
        pancakesCache.set(this.pancakesCacheId, pancakes);
        pancakesCache.set(this.isPancakesLoadingLocked, false);
      })
      .catch(() => {
        pancakesCache.set(this.isPancakesLoadingLocked, false);
      });
  }
}
