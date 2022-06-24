import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { cloneDeep } from 'lodash';
import { map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { BalancesResponse, FeatureEnum, Logger, ProtocolTypeEnum } from '@app/common';
import { BaseDataLp } from '@app/common/dto/base.data.lp.dto';
import { NotifyPools } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';
import { concatStrings } from '@app/common/utils';
import { toDecimals } from '@app/common/utils/number';
import { toChunkedArray } from '@app/common/utils/transform';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../microservices/account.service';
import { LIMIT_DATA } from './orca.constant';
import { globalFarmData, modifiedBalanceDataPool, userFarmData } from './orca.interface';
import { calculateRewards } from './orca.reward';
import {
  filterResponsesGlobalFarm,
  filterResponsesUserFarms,
  findProgramAddress,
} from './orca.utils';

@Injectable()
export class OrcaPools {
  private rpcUrl: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly accountService: AccountService,
  ) {
    this.rpcUrl = this.configService.get('SOL_URL');
  }

  public async getData({ addresses, protocolName, projectName, chain }): Promise<BaseData[]> {
    const cacheKey = `${chain.id}_${protocolName}_${FeatureEnum.pools}`;
    const cachedPools: NotifyPools = await this.cache.get(cacheKey);
    if (!cachedPools) {
      throw new Error(`not found cached data for key '${cacheKey}'`);
    }

    const baseDataStakingMap: Map<string, BaseDataLp> = new Map<string, BaseDataLp>(
      addresses.map((a) => [
        a,
        plainToClass(BaseDataLp, {
          chain: chain,
          userAddress: a,
          protocolType: ProtocolTypeEnum.amm,
          projectName: projectName,
          items: [],
          feature: FeatureEnum.pools,
        }),
      ]),
    );
    const lpBalances: BalancesResponse = await this.accountService.getBalancesPost(
      addresses,
      [chain.id],
      cachedPools.items.map((i) => i.lpToken.address),
    );
    const pools = this.filterActivePools(addresses, lpBalances, cachedPools.items);
    if (pools.length > 0) {
      const balances = await this.getAccountUserFarms(addresses, pools);
      const infoFarms = await this.getAccountGlobalFarms(pools);

      const filteredBalances = await this.filterAndModificateBalances(pools, balances, infoFarms);

      for (const b of filteredBalances) {
        const { pool, balance, farm } = b;
        const poolPosition: LiquidityPoolFeature = cloneDeep(pool);

        balance.forEach(async (bl, index) => {
          const reward = await calculateRewards(bl, farm[index]);
          poolPosition.rewards[index].claimableData.balance = toDecimals(
            +reward,
            poolPosition.rewards[index].decimals,
          );
          poolPosition.rewards[index].claimableData.value =
            +poolPosition.rewards[index].claimableData.balance * poolPosition.rewards[index].price;
        });
        const poolShare = new BigNumber(pool.extra.lpToken.decimalsAmount).div(
          new BigNumber(pool.lpToken.totalSupply),
        );

        poolPosition.tokens.forEach((t) => {
          const b = new BigNumber(t.reserve).times(poolShare);
          t.balance = b.toNumber();
          t.value = t.balance * t.price;
        });
        poolPosition.stats.share = poolShare.toNumber();

        poolPosition.extra = undefined;
        baseDataStakingMap.get(balance[0].owner).items.push(poolPosition);
      }
    }
    return Array.from(baseDataStakingMap.values());
  }

  private filterActivePools(
    addresses: string[],
    lpBalances: BalancesResponse,
    cachedPools: LiquidityPoolFeature[],
  ) {
    const cachedPoolsMap: Map<string, any> = new Map<string, any>(
      cachedPools.map((i) => [i.lpToken.address, i]),
    );

    const lpPools = [];
    for (const a of addresses) {
      const lpBalance = lpBalances[a];
      lpBalance.tokens.forEach((tb) => {
        if (tb.decimalsAmount > 0) {
          const pool = cachedPoolsMap.get(tb.token.address);
          if (pool?.extra) {
            pool.extra.lpToken = tb;
            lpPools.push(pool);
          } else {
            throw new Error('Wrong data from cache. No extra data!');
          }
        }
      });
    }

    return lpPools;
  }

  private async filterAndModificateBalances(
    pools: LiquidityPoolFeature[],
    balances: Map<string, userFarmData[]>,
    infoFarms: globalFarmData[],
  ): Promise<modifiedBalanceDataPool[]> {
    const modifiedDataBalances = new Map<string, modifiedBalanceDataPool>();
    const balancesMap = [];
    Array.from(balances).map(([address, b]) => {
      const list = b.map((a) => [address, a]);
      balancesMap.push(...list);
    });

    const poolByAQ = new Map(pools.map((p) => [p.extra.poolInfo.aq?.account, p]));
    const poolByDD = new Map(pools.map((p) => [p.extra.poolInfo.dd?.account, p]));

    for (const [address, balance] of balancesMap) {
      const pool: {
        aq?: LiquidityPoolFeature;
        dd?: LiquidityPoolFeature;
      } = {};

      pool.aq = poolByAQ.get(balance.globalFarm);
      pool.dd = poolByDD.get(balance.globalFarm);

      if (pool?.aq || pool?.dd) {
        const filteredFarmsInfo = infoFarms.find(
          (f) =>
            pool?.aq?.extra?.poolInfo?.aq?.farmTokenMint === f.farmTokenMint ||
            pool?.dd?.extra?.poolInfo?.dd?.farmTokenMint === f.farmTokenMint,
        );
        const keyName = concatStrings(address, pool.aq ? pool.aq?.address : pool.dd?.address);
        const balanceList = modifiedDataBalances.get(keyName);

        if (balanceList) {
          modifiedDataBalances.delete(keyName);
        } else {
          modifiedDataBalances.set(keyName, {
            balance: [balance],
            pool: pool.aq ? pool.aq : pool.dd,
            farm: [filteredFarmsInfo],
          });
        }
      }
    }

    return [...modifiedDataBalances.values()];
  }

  private async getAccountGlobalFarms(farms: LiquidityPoolFeature[]): Promise<globalFarmData[]> {
    const options = {
      jsonrpc: '2.0',
      method: ['getAccountInfo', 'getTokenSupply'],
      encoding: 'jsonParsed',
    };
    const rpcDataRequests = [];
    let idRpc = 0;
    for (const farm of farms) {
      const { aq } = farm.extra.poolInfo;
      if (aq) {
        rpcDataRequests.push({
          jsonrpc: options.jsonrpc,
          id: idRpc + ':' + aq.account,
          method: options.method[0],
          params: [
            aq.account,
            {
              encoding: options.encoding,
            },
          ],
        });
        rpcDataRequests.push({
          jsonrpc: options.jsonrpc,
          id: idRpc + ':' + aq.farmTokenMint,
          method: options.method[1],
          params: [aq.farmTokenMint],
        });
        idRpc++;
      }
    }

    const chunks = toChunkedArray(rpcDataRequests, LIMIT_DATA);
    const responses = [];
    for (const chunk of chunks) {
      const rpcResponse = await this.httpService
        .post(this.rpcUrl, chunk)
        .pipe(map((response) => response.data))
        .toPromise();

      responses.push(...rpcResponse);
    }

    const filteredResponses = filterResponsesGlobalFarm(responses);

    return [...filteredResponses.values()];
  }

  private async getAccountUserFarms(
    addresses: string[],
    farms: LiquidityPoolFeature[],
  ): Promise<Map<string, userFarmData[]>> {
    const options = {
      jsonrpc: '2.0',
      method: 'getAccountInfo',
      encoding: 'jsonParsed',
    };
    let idRpc = 0;
    const rpcDataRequests = [];
    for (const farm of farms) {
      const { aq, dd } = farm.extra.poolInfo;
      for (const wallet of addresses) {
        if (aq) {
          const addressAQ = await findProgramAddress(aq.account, wallet);
          rpcDataRequests.push({
            jsonrpc: options.jsonrpc,
            id: idRpc++,
            method: options.method,
            params: [
              addressAQ.toBase58(),
              {
                encoding: options.encoding,
              },
            ],
          });
        }
        if (dd) {
          const addressDD = await findProgramAddress(dd.account, wallet);
          rpcDataRequests.push({
            jsonrpc: options.jsonrpc,
            id: idRpc++,
            method: options.method,
            params: [
              addressDD.toBase58(),
              {
                encoding: options.encoding,
              },
            ],
          });
        }
      }
    }

    const chunks = toChunkedArray(rpcDataRequests, LIMIT_DATA);

    const responses = [];
    for (const chunk of chunks) {
      const rpcResponse = await this.httpService
        .post(this.rpcUrl, chunk)
        .pipe(map((response) => response.data))
        .toPromise();

      responses.push(...rpcResponse);
    }

    const filteredResponses = filterResponsesUserFarms(responses);
    return filteredResponses;
  }
}
