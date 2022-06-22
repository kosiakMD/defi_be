// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import { ClassConstructor } from 'class-transformer';
import { filter, from, lastValueFrom, mergeMap, toArray } from 'rxjs';

import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, ChainId, Logger } from '@app/common';
import { getChainById } from '@app/common/utils';

import { ErrorWithHttpInfo } from '../../common/types/error-with-http-info';

import getPlatforms from '../platforms';
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
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

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

    const { data: wallets, errors } = await platform.getUsersData(
      chains.length ? chains : platform.getSupportedChains(),
      addresses,
    );

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

    const { data: items, errors } = await platform.getPoolData(
      chains.length ? chains : platform.getSupportedChains(),
    );

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
    const requestedChains = chains.length ? chains : platform.getSupportedChains();

    const [cached, errors] = await platform.cachePoolData(requestedChains);

    const errorMessages = this.processErrors(errors, platformName);

    if (debug) {
      const { data: pools, errors: poolErrors } = await platform.getPoolData(requestedChains);
      const flat = cached.flat();
      const poolErrorMessages = this.processErrors(poolErrors, platformName);
      if (flat.length !== pools.length) {
        errorMessages.push(
          `Failed to hydrate some opportunities. Missing ${flat.length - pools.length}/${
            flat.length
          }`,
        );
      }
      return {
        errors: Array.from(new Set(errorMessages.concat(poolErrorMessages))),
        data: {
          count: flat.length,
          message: `${platformName} minimal opportunities have been cached`,
          minimal: cached, // not flattened so that each array is its own 'protocol' to help debug
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
    const platforms = await getPlatforms(this.configService.get('PLATFORMS_TO_EXCLUDE').split(','));
    await this.registerPlatforms(platforms);

    await this.getProtocolList();
  }
}
