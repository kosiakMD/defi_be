import { BigNumber as BN } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, FeatureEnum, Logger } from '@app/common';
import { gql } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { RootProtocol } from '../../../RootProtocol';
import {
  IPoolFeatureEntryMinimal,
  IPoolFeatureEntryOpportunity,
  IPoolFeatureEntryUserEntry,
} from '../../../interfaces/feature.liqudity-pool.interface';

type CacheMeta = { totalSupply: string; liability: string };

export class PlatypusLiquidity extends RootProtocol<
  IPoolFeatureEntryMinimal<CacheMeta>,
  IPoolFeatureEntryOpportunity,
  IPoolFeatureEntryUserEntry
> {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected httpService: HttpService,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected multicall: MulticallAggregator,
  ) {
    super();
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  async getUsersData(
    addresses: Address[],
  ): Promise<[Map<Address, IPoolFeatureEntryUserEntry[]>, Error[]]> {
    const [pools, errors] = await this.getPoolData();
    this.logger.error('POOLS: ' + JSON.stringify(pools) + ' ERRORS ' + JSON.stringify(errors.map(e => e.toString())));

    return Promise.resolve([undefined, []]);
  }

  async getCacheableOpportunityData(): Promise<IPoolFeatureEntryMinimal[]> {
    const {
      data: {
        data: { assets },
      },
    } = await firstValueFrom(
      this.httpService.post<GraphResponse>(
        'https://api.thegraph.com/subgraphs/name/platypus-finance/platypus-exchange-v2',
        {
          query: gql`
            {
              assets {
                id
                name
                liability
                token {
                  id
                  name
                  symbol
                  decimals
                }
                pool {
                  id
                }
              }
            }
          `,
        },
      ),
    );

    const totalSupplies = await this.multicall.callArray(
      assets.map(({ id }) => new DynamicContract(id).createCall(ERC20.totalSupply)),
      this.meta.chain,
    );

    const xx = assets.map((asset, index) => ({
      feature: FeatureEnum.pools as any,
      chain: this.meta.chain,
      token: {
        address: asset.id,
        name: asset.name,
        // LP Tokens copy decimals from underlying
        decimals: +asset.token.decimals,
        underlying: [
          {
            address: asset.token.id,
            decimals: +asset.token.decimals,
            name: asset.token.name,
            symbol: asset.token.symbol,
          },
        ],
      },
      meta: {
        totalSupply: totalSupplies[index],
        liability: asset.liability,
      },
    }));

    this.logger.warn('AAAAAAAA ' + JSON.stringify(xx));

    return xx;
  }

  protected formatOpportunity(
    opportunity: IPoolFeatureEntryMinimal<CacheMeta>,
    tokens: Map<Address, any>,
  ): void | IPoolFeatureEntryOpportunity {
    this.logger.warn('Opportunity: ' + JSON.stringify(opportunity));
    this.logger.warn('Tokens: ' + JSON.stringify(tokens));
    this.logger.warn('Opportunity 1: ' + JSON.stringify(opportunity.token));
    this.logger.warn('Opportunity 2: ' + JSON.stringify(opportunity.token.underlying));
    this.logger.warn('Opportunity 3: ' + JSON.stringify(opportunity.token.underlying[0]));
    this.logger.warn('Opportunity 4: ' + JSON.stringify(opportunity.token.underlying[0].address));

    const underlyingAddress = opportunity.token.underlying[0].address;
    this.logger.warn('Opportunity 5: ' + JSON.stringify(tokens.get(underlyingAddress)));
    const underlying = tokens.get(underlyingAddress);
    if (!underlying) {
      this.logger.warn(`Missing underlying token ${underlyingAddress}`, this.constructor.name);
      return null;
    }

    this.logger.log('here1');

    const { token } = opportunity;
    const { liability, totalSupply } = opportunity.meta;

    this.logger.log('here2');

    const decimalsMultiplier = new BN(10).pow(token.decimals);

    this.logger.log('here3');

    const price = new BN(liability)
      .times(decimalsMultiplier)
      .div(new BN(totalSupply))
      .times(new BN(underlying.price));

    this.logger.log('here5');

    const tvl = price.times(new BN(totalSupply)).div(decimalsMultiplier);

    this.logger.log('here5');

    return {
      chain: this.meta.chain,
      feature: FeatureEnum.pools,
      token: {
        ...token,
        price: price.toNumber(),
        underlying: tokens[underlying.address],
      },
      tvl: tvl.toNumber(),
    };
  }
}

type GraphResponse = {
  data: {
    assets: Array<Asset>;
  };
};

type Asset = {
  id: string;
  name: string;
  liability: string;
  token: {
    id: string;
    name: string;
    symbol: string;
    decimals: string;
  };
  pool: {
    id: string;
  };
};
