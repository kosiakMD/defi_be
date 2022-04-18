// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { ClassConstructor } from 'class-transformer';
import { filter, from, lastValueFrom, mergeMap, toArray } from 'rxjs';

import { Inject, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainId, Logger } from '@app/common';

import { AaveV3 } from '../platforms/AaveV3';
import { ApeSwap } from '../platforms/ApeSwap';
import { BrickChain } from '../platforms/BrickChain';
import { CafeSwap } from '../platforms/CafeSwap';
import { CheesecakeSwap } from '../platforms/CheesecakeSwap';
import { CubFinance } from '../platforms/CubFinance';
import { Evodefi } from '../platforms/Evodefi';
import { IronFinance } from '../platforms/IronFinance';
import { Lido } from '../platforms/Lido';
import { LimeSwap } from '../platforms/LimeSwap';
import { Nerve } from '../platforms/Nerve';
import { PaintSwap } from '../platforms/PaintSwap';
import { PancakeSwap } from '../platforms/PancakeSwap';
import { PastaFinance } from '../platforms/PastaFinance';
import { Polywhale } from '../platforms/Polywhale';
import { QuickSwap } from '../platforms/QuickSwap';
import { RuneFarm } from '../platforms/RuneFarm';
import { SpookySwap } from '../platforms/SpookySwap';
import { TombFinance } from '../platforms/TombFinance';
import { TreeDefi } from '../platforms/TreeDefi';
import { WaultFinance } from '../platforms/WaultFinance';
import { RootPlatform } from '../support/RootPlatform';
import { IPlatformMeta } from '../support/interfaces';
import {
  IOpportunityResponse,
  IUserEntryResponse,
  StandardResponse,
} from '../support/interfaces/responses.interface';

@Injectable()
export class PlatformService {
  constructor(
    private readonly moduleRef: ModuleRef,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.registerPlatforms({
      Lido,
      PaintSwap,
      PancakeSwap,
      QuickSwap,
      SpookySwap,
      TombFinance,
      ApeSwap,
      Polywhale,
      CafeSwap,
      WaultFinance,
      IronFinance,
      Nerve,
      CubFinance,
      TreeDefi,
      CheesecakeSwap,
      RuneFarm,
      PastaFinance,
      BrickChain,
      Evodefi,
      LimeSwap,
      AaveV3,
    });
  }

  platforms: Map<string, ClassConstructor<RootPlatform>> = new Map();
  platformsInitialized: Map<string, RootPlatform> = new Map();
  protected async registerPlatforms(platforms: { [key: string]: ClassConstructor<RootPlatform> }) {
    Object.entries(platforms).map(([name, platform]) => this.platforms.set(name, platform));
  }

  private async getPlatform(name: string) {
    if (!this.platforms.has(name)) {
      throw new Error('Platform Not Supported');
    }

    if (this.platformsInitialized.has(name)) {
      return this.platformsInitialized.get(name);
    }

    const instance = await this.moduleRef.create(this.platforms.get(name));
    await instance.initialize();
    this.platformsInitialized.set(name, instance);

    return instance;
  }

  public getProtocolList() {
    const data$ = from(this.platforms.keys()).pipe(
      mergeMap(async (name) => {
        try {
          const instance = await this.getPlatform(name);
          return instance.getMeta();
        } catch (err) {
          this.logger.error(err.message || err, err.stack, `${this.constructor.name}/${name}`);
          return null;
        }
      }),
      filter((result: IPlatformMeta | null) => !!result),
      toArray(),
    );

    return lastValueFrom(data$);
  }

  public async getUserPositionsForProtocol(
    platformName: string,
    chains: ChainId[],
    addresses: Address[],
  ): Promise<IUserEntryResponse> {
    const platform = await this.getPlatform(platformName);

    const [wallets, errors] = await platform.getUsersData(chains, addresses);

    const total = wallets.reduce((total, wallet) => total + wallet.total, 0);

    const errorMessages = this.processErrors(errors, platformName);

    return {
      errors: Array.from(new Set(errorMessages)),
      data: {
        protocol: platform.getMeta(),
        wallets,
        total,
      },
    };
  }

  public async getOpportunitiesForProtocol(
    platformName: string,
    chains: ChainId[],
  ): Promise<IOpportunityResponse> {
    const platform = await this.getPlatform(platformName);

    const [items, errors] = await platform.getPoolData(chains);

    const errorMessages = this.processErrors(errors, platformName);

    return {
      errors: Array.from(new Set(errorMessages)),
      data: {
        protocol: platform.getMeta(),
        items: items.flat(),
      },
    };
  }

  public async cacheOpportunitiesForProtocol(
    platformName: string,
    chains: ChainId[],
    debug: boolean,
  ): Promise<StandardResponse<any>> {
    const platform = await this.getPlatform(platformName);

    const [cached, errors] = await platform.cachePoolData(chains);

    const errorMessages = this.processErrors(errors, platformName);

    if (debug) {
      const [pools, poolErrors] = await platform.getPoolData(chains);
      const poolErrorMessages = this.processErrors(poolErrors, platformName);
      return {
        errors: Array.from(new Set(errorMessages.concat(poolErrorMessages))),
        data: {
          count: cached.flat().length,
          message: `${platformName} opportunities have been cached`,
          raw: cached,
          hydrated: pools,
        },
      };
    }

    return {
      errors: Array.from(new Set(errorMessages)),
      data: {
        count: cached.flat().length,
        message: `${platformName} opportunities have been cached`,
      },
    };
  }

  private processErrors(errors: Error[], context: string) {
    return errors.map((error) => {
      this.logger.error(error.message, error.stack, context);
      return error.message;
    });
  }
}
