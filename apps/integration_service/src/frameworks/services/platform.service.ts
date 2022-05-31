// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import { ClassConstructor } from 'class-transformer';
import { filter, from, lastValueFrom, mergeMap, toArray } from 'rxjs';

import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, ChainId, Logger } from '@app/common';
import { getChainById } from '@app/common/utils';

import { ErrorWithHttpInfo } from '../../common/types/error-with-http-info';

import { AaveV3 } from '../platforms/aave-v3';
import { AlchemixV2 } from '../platforms/alchemix-v2';
import { ApeSwap } from '../platforms/ape-swap';
import { BabySwap } from '../platforms/baby-swap';
import { BalancerV2 } from '../platforms/balancer-v2';
import { Belt } from '../platforms/belt';
import { BiSwap } from '../platforms/bi-swap';
import { CafeSwap } from '../platforms/cafe-swap';
import { CheesecakeSwap } from '../platforms/cheesecake-swap';
import { CubFinance } from '../platforms/cub-finance';
import { Ellipsis } from '../platforms/ellipsis';
import { Evodefi } from '../platforms/evodefi';
import { Frax } from '../platforms/frax';
import { Goose } from '../platforms/goose';
import { IronBank } from '../platforms/iron-bank';
import { Kava } from '../platforms/kava';
import { KnightSwap } from '../platforms/knight-swap';
import { Lido } from '../platforms/lido';
import { MakerDAO } from '../platforms/maker-dao';
// import { LimeSwap } from '../platforms/lime-swap';
import { MarsEcosystem } from '../platforms/mars-ecosystem';
import { Mdex } from '../platforms/mdex';
import { Mojitoswap } from '../platforms/mojitoswap';
import { PaintSwap } from '../platforms/paint-swap';
import { PancakeSwap } from '../platforms/pancake-swap';
import { Quarry } from '../platforms/quarry';
import { QuickSwap } from '../platforms/quick-swap';
import { RocketPool } from '../platforms/rocket-pool';
import { RuneFarm } from '../platforms/rune-farm';
import { Solend } from '../platforms/solend';
import { SpookySwap } from '../platforms/spooky-swap';
import { Stargate } from '../platforms/stargate';
import { Synapse } from '../platforms/synapse';
import { TombFinance } from '../platforms/tomb-finance';
import { TreeDefi } from '../platforms/tree-defi';
import { WaultFinance } from '../platforms/wault-finance';
import { YelFinance } from '../platforms/yel-finance';
import { IPlatformMeta } from '../support/interfaces';
import {
  IOpportunityResponse,
  IUserEntryResponse,
  StandardResponse,
} from '../support/interfaces/responses.interface';
import { RootPlatform } from '../support/root-platform';

@Injectable()
export class PlatformService implements OnApplicationBootstrap {
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
      CafeSwap,
      WaultFinance,
      CubFinance,
      TreeDefi,
      CheesecakeSwap,
      RuneFarm,
      Evodefi,
      // LimeSwap,
      BalancerV2,
      AaveV3,
      Frax,
      Kava,
      Solend,
      Quarry,
      AlchemixV2,
      Mojitoswap,
      BiSwap,
      Mdex,
      KnightSwap,
      Belt,
      MarsEcosystem,
      Goose,
      BabySwap,
      YelFinance,
      Ellipsis,
      RocketPool,
      Stargate,
      Synapse,
      MakerDAO,
      IronBank,
    });
  }

  platforms: Map<string, ClassConstructor<RootPlatform>> = new Map();
  platformsInitialized: Map<string, RootPlatform> = new Map();

  protected async registerPlatforms(platforms: { [key: string]: ClassConstructor<RootPlatform> }) {
    Object.entries(platforms)
      .sort(([nameA], [nameB]) => (nameA > nameB ? 1 : -1))
      .forEach(([name, platform]) => this.platforms.set(name, platform));
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

  public async getUserPositionsForPlatform(
    platformName: string,
    chains: ChainId[],
    addresses: Address[],
  ): Promise<IUserEntryResponse> {
    const platform = await this.getPlatform(platformName);

    const { data: wallets, errors } = await platform.getUsersData(chains, addresses);

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

  public async getOpportunitiesForPlatform(
    platformName: string,
    chains: ChainId[],
  ): Promise<IOpportunityResponse> {
    const platform = await this.getPlatform(platformName);

    const { data: items, errors } = await platform.getPoolData(chains);

    const errorMessages = this.processErrors(errors, platformName);

    return {
      errors: Array.from(new Set(errorMessages)),
      data: {
        protocol: platform.getMeta(),
        items: items.flat(),
      },
    };
  }

  public async cacheOpportunities(): Promise<StandardResponse<any>> {
    const chainsProtocols: {
      // key is ChainId
      [key: string]: string[];
    } = {};
    const protocols = await this.getProtocolList();
    protocols.forEach((p) => {
      p.features.forEach((f) => {
        if (!chainsProtocols[f.chain.id]) {
          chainsProtocols[f.chain.id.toString()] = [];
        }
        chainsProtocols[f.chain.id.toString()].push(p.name);
      });
    });

    const promises: Promise<{
      chain: ChainDto;
      results: any;
    }>[] = Object.entries(chainsProtocols).map(async ([chain, cProtocols]) => {
      const result = [];
      for (const protocol of cProtocols as string[]) {
        const res = await this.cacheOpportunitiesForPlatform(protocol, [Number(chain)], false);
        result.push(res);
      }
      return {
        chain: getChainById(Number(chain)),
        results: result,
      };
    });

    const results = await Promise.all(promises);
    return {
      errors: [],
      data: results,
    };
  }

  public async cacheOpportunitiesForPlatform(
    platformName: string,
    chains: ChainId[],
    debug: boolean,
  ): Promise<StandardResponse<any>> {
    const platform = await this.getPlatform(platformName);

    const [cached, errors] = await platform.cachePoolData(chains);

    const errorMessages = this.processErrors(errors, platformName);

    if (debug) {
      const { data: pools, errors: poolErrors } = await platform.getPoolData(chains);

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

  private processErrors(errors: (ErrorWithHttpInfo | string)[], context: string): string[] {
    return errors.map((error: ErrorWithHttpInfo | string) => {
      if (typeof error === 'string') {
        return error;
      }
      this.logger.error(error.message, error.stack, context);
      let message = error.message;
      if (error.response) {
        message += ' for ' + error.request.host + error.request.path;
      }
      return message;
    });
  }

  async onApplicationBootstrap() {
    await this.getProtocolList();
  }
}
