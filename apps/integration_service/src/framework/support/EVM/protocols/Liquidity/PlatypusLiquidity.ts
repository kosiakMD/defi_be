import { BigNumber as BN } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, FeatureEnum, Logger } from '@app/common';
import { gql, normalizeDecimals } from '@app/common/utils';
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
    // TODO: How to return common errors?
    const [pools, errors] = await this.getPoolData();

    // TODO: Any way to handle this better for few users?
    // TODO: Should we have try catch here?
    const promises = addresses.map<Promise<[Address, IPoolFeatureEntryUserEntry[]]>>(
      async (address) => {
        const balances = await this.multicall.callArray(
          pools.map(({ token }) =>
            new DynamicContract(token.address).createCall(ERC20.balanceOf, address),
          ),
          this.meta.chain,
        );

        // TODO: This models and mapping code seems to be too complex
        const userPromises = pools.map<IPoolFeatureEntryUserEntry>((pool, index) => {
          const balance = balances[index];
          const value = normalizeDecimals(balance, pool.token.decimals) * pool.token.price;
          return {
            ...pool,
            balance,
            value,
          };
        });

        const userResults = await Promise.all(userPromises);

        // TODO: Would be good to move it to common code
        return [address, userResults.filter(({ value }) => value > 0)];
      },
    );

    const results = await Promise.all(promises);

    // TODO: How to handle errors here?
    return [new Map(results), errors];
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

    return assets.map((asset, index) => ({
      feature: FeatureEnum.pools,
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
  }

  protected formatOpportunity(
    opportunity: IPoolFeatureEntryMinimal<CacheMeta>,
    tokens: Map<Address, any>,
  ): void | IPoolFeatureEntryOpportunity {
    const underlyingAddress = opportunity.token.underlying[0].address;
    const underlying = tokens.get(underlyingAddress);
    if (!underlying) {
      this.logger.warn(`Missing underlying token ${underlyingAddress}`, this.constructor.name);
      return null;
    }

    const { token } = opportunity;
    const { liability, totalSupply } = opportunity.meta;

    const decimalsMultiplier = new BN(10).pow(token.decimals);

    const price = new BN(liability)
      .times(decimalsMultiplier)
      .div(new BN(totalSupply))
      .times(new BN(underlying.price));

    const tvl = price.times(new BN(totalSupply)).div(decimalsMultiplier);

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
