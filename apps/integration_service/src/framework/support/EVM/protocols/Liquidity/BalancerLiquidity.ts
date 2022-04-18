import { Cache } from 'cache-manager';
import { map, mergeMap, toArray, firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { FeatureEnum, Logger } from '@app/common';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { IProtocolMeta, IRootProtocol } from '../../../interfaces';
import { IPoolFeatureEntryUserEntry } from '../../../interfaces/feature.pool.interface';
import { Balancer } from '../../Balancer';
import { IBalancerUserResponce, USERS_POOL_SHARES } from '../../Subgraphs/BalancerSubgraph';

interface IBalancerVaultMeta extends IProtocolMeta {
  context: {
    key: string;
  };
  feature: FeatureEnum.pools;
}

export class BalancerLiquidity extends Balancer implements IRootProtocol {
  protected multicall: MulticallAggregator;
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected httpService: HttpService,
  ) {
    super();
  }
  meta: IBalancerVaultMeta;

  async getUsersData(
    addresses: string[],
  ): Promise<[Map<string, IPoolFeatureEntryUserEntry[]>, Error[]]> {
    const [pools, errors] = await this.getPoolData();
    const wallets = new Map();
    const poolsMap = new Map(pools.map((x) => [x.id, x]));
    try {
      const addressesBalances = await this.accountBalances(addresses);
      const balances = new Map(addressesBalances.map((b) => [b.address, b.liquidity]));

      for (const address of addresses) {
        const data = this.calculateBalances(poolsMap, balances.get(address));
        wallets.set(address, data);
      }
    } catch (err) {
      errors.push(err);
    }

    return [wallets, errors];
  }

  private async accountBalances(addresses: string[]) {
    const $data = this.httpService
      .post<IBalancerUserResponce>(this.baseURI + this.meta.context.key, {
        query: USERS_POOL_SHARES,
        variables: { addresses },
      })
      .pipe(
        mergeMap((responce) => responce.data.data.users),
        map((liquidity) => {
          return {
            address: liquidity.id,
            liquidity: liquidity.sharesOwned.map((share) => {
              return {
                ...share.poolId,
                balance: share.balance,
              };
            }),
          };
        }),
        toArray(),
      );

    return firstValueFrom($data);
  }
}
