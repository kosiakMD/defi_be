// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import { ClassConstructor } from 'class-transformer';
import { filter, from, lastValueFrom, mergeMap, toArray } from 'rxjs';

import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, ChainId, Logger } from '@app/common';
import { getChainById } from '@app/common/utils';

import { ErrorWithHttpInfo } from '../../common/types/error-with-http-info';

import { AaveV2 } from '../platforms/AaveV2';
import { AaveV3 } from '../platforms/AaveV3';
import { AlchemixV2 } from '../platforms/AlchemixV2';
import { ApeSwap } from '../platforms/ApeSwap';
import { BabySwap } from '../platforms/BabySwap';
import { BalancerV2 } from '../platforms/BalancerV2';
import { Belt } from '../platforms/Belt';
import { Benqi } from '../platforms/Benqi';
import { BiSwap } from '../platforms/BiSwap';
import { Blizz } from '../platforms/Blizz';
import { CafeSwap } from '../platforms/CafeSwap';
import { CheesecakeSwap } from '../platforms/CheesecakeSwap';
import { CherrySwap } from '../platforms/CherrySwap';
import { CryptoComDefiSwap } from '../platforms/CryptoComDefiSwap';
import { CubFinance } from '../platforms/CubFinance';
import { DfynNetwork } from '../platforms/DfynNetwork';
import { Ellipsis } from '../platforms/Ellipsis';
import { Evodefi } from '../platforms/Evodefi';
import { Frax } from '../platforms/Frax';
import { Geist } from '../platforms/Geist';
import { Goose } from '../platforms/Goose';
import { IronBank } from '../platforms/IronBank';
import { Kava } from '../platforms/Kava';
import { KnightSwap } from '../platforms/KnightSwap';
import { KyberSwap } from '../platforms/KyberSwap';
import { Lido } from '../platforms/Lido';
import { Liquity } from '../platforms/Liquity';
import { MakerDAO } from '../platforms/MakerDAO';
// import { LimeSwap } from '../platforms/LimeSwap';
import { MarsEcosystem } from '../platforms/MarsEcosystem';
import { Mdex } from '../platforms/Mdex';
import { Mojitoswap } from '../platforms/Mojitoswap';
import { MuesliSwap } from '../platforms/MuesliSwap';
import { Nereus } from '../platforms/Nereus';
import { Netswap } from '../platforms/Netswap';
import { PaintSwap } from '../platforms/PaintSwap';
import { PancakeSwap } from '../platforms/PancakeSwap';
import { Quarry } from '../platforms/Quarry';
import { QuickSwap } from '../platforms/QuickSwap';
import { RocketPool } from '../platforms/RocketPool';
import { RuneFarm } from '../platforms/RuneFarm';
import { SashimiSwap } from '../platforms/SashimiSwap';
import { Solend } from '../platforms/Solend';
import { SpiritSwap } from '../platforms/SpiritSwap';
import { SpookySwap } from '../platforms/SpookySwap';
import { Stargate } from '../platforms/Stargate';
import { Swapr } from '../platforms/Swapr';
import { Synapse } from '../platforms/Synapse';
import { TombFinance } from '../platforms/TombFinance';
import { TreeDefi } from '../platforms/TreeDefi';
import { WaultFinance } from '../platforms/WaultFinance';
import { YelFinance } from '../platforms/YelFinance';
import { YetiFinance } from '../platforms/YetiFinance';
import { Zenlink } from '../platforms/Zenlink';
import { RootPlatform } from '../support/RootPlatform';
import { IPlatformMeta } from '../support/interfaces';
import {
  IOpportunityResponse,
  IUserEntryResponse,
  StandardResponse,
} from '../support/interfaces/responses.interface';

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
      // LimeSwap, // TODO: mark as rugged/scam. remove from explore opportunities, may still show user positions
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
      MuesliSwap,
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
      SpiritSwap,
      KyberSwap,
      CryptoComDefiSwap,
      YetiFinance,
      MakerDAO,
      IronBank,
      Benqi,
      AaveV2,
      Nereus,
      Geist,
      Blizz,
      Swapr,
      DfynNetwork,
      Netswap,
      CherrySwap,
      SashimiSwap,
      Liquity,
      Zenlink,
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
