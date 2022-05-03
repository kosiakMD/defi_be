import { Cache } from 'cache-manager';
import { firstValueFrom, map, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { FeatureEnum, Logger } from '@app/common';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { IProtocolMeta, IRootProtocol } from '../../../interfaces';
import { IStakingFeatureUserEntry } from '../../../interfaces/feature.staking.interface';
import { Balancer } from '../../Balancer';
import { IBalancerUsersYieldsResponce, USERS_YIELDS } from '../../Subgraphs/BalancerSubgraph';

export interface IBalancerVaultMeta extends IProtocolMeta {
  feature: FeatureEnum.staking;
  name: string;
  context: { key: string };
}

export class BalancerStaking extends Balancer<IBalancerVaultMeta> implements IRootProtocol {
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

  private gaugesURI = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges';

  initialize(): Promise<void> {
    return void 0;
  }

  async getUsersData(
    addresses: string[],
  ): Promise<[Map<string, IStakingFeatureUserEntry[]>, Error[]]> {
    const [pools, errors] = await this.getPoolData();
    const wallets = new Map();
    const poolsMap = new Map(pools.map((x) => [x.id, x]));
    try {
      const accountBalances = await this.accountBalances(addresses);
      const balances = new Map(accountBalances.map((b) => [b.address, b.yields]));

      for (const address of addresses) {
        if (!balances.has(address)) continue;
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
      .post<IBalancerUsersYieldsResponce>(this.gaugesURI, {
        query: USERS_YIELDS,
        variables: { addresses },
      })
      .pipe(
        mergeMap((responce) => responce.data.data.users),
        map((farm) => {
          return {
            address: farm.id,
            yields: farm.gaugeShares.map((share) => {
              return {
                address: share.gauge.poolAddress,
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
