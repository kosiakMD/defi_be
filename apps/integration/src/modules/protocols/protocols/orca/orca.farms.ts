import { Connection } from '@solana/web3.js';
import { toDecimals } from 'apps/account/src/common/utils';
import { BigNumber as BN } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { cloneDeep } from 'lodash';
import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainDto,
  FeatureEnum,
  Logger,
  OrcaProtocolEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { concatStrings } from '@app/common/utils';
import { toChunkedArray } from '@app/common/utils/transform';

import { Web3Provider } from '../../../chains/web3.provider';
import { LIMIT_DATA } from './orca.constant';
import { globalFarmData, modifiedBalanceData, userFarmData } from './orca.interface';
import { calculateRewards } from './orca.reward';
import {
  filterResponsesGlobalFarm,
  filterResponsesUserFarms,
  findProgramAddress,
} from './orca.utils';

@Injectable()
export class OrcaFarms {
  private web3: Connection;
  private rpcUrl: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly web3Provider: Web3Provider,
  ) {
    this.web3 = web3Provider.instanceSol();
    this.rpcUrl = this.configService.get('SOL_URL');
  }

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    if (addresses.length === 0) {
      return [];
    }
    const cacheKey = `${chain.id}_${OrcaProtocolEnum.orca}_${FeatureEnum.farming}`;
    const cachedPools: NotifyStaking = await this.cache.get(cacheKey);
    if (!cachedPools || cachedPools?.items?.length === 0) {
      throw new Error(`not found cached data for key '${cacheKey}'`);
    }
    const pools = cloneDeep(cachedPools.items);
    const baseDataStakingMap: Map<string, BaseDataStaking> = new Map<string, BaseDataStaking>(
      addresses.map((a) => [
        a,
        plainToClass(BaseDataStaking, {
          chain: chain,
          userAddress: a,
          protocolType: ProtocolTypeEnum.staking,
          projectName: OrcaProtocolEnum.orca,
          feature: FeatureEnum.farming,
          items: [],
        }),
      ]),
    );

    const balances = await this.getAccountUserFarms(addresses, pools);
    const infoFarms = await this.getAccountGlobalFarms(pools);
    const filteredBalances = await this.filterAndModificateBalances(pools, balances, infoFarms);

    for (const b of filteredBalances) {
      const { pool, balance, farm } = b;
      if (pool.extra.farm?.dd) {
        const stakingPosition: IntegrationStakingPositionDto = cloneDeep(pool);
        if (+balance[1]?.baseTokensConverted > 0) {
          for (const key in balance) {
            const bl = balance[key];
            const reward = await calculateRewards(bl, farm[key]);
            stakingPosition.rewards[key].claimableData.balance = toDecimals(
              +reward,
              stakingPosition.rewards[key].decimals,
            );
            stakingPosition.rewards[key].claimableData.value =
              +stakingPosition.rewards[key].claimableData.balance *
              stakingPosition.rewards[key].price;
          }
          stakingPosition.staked = balance[1].baseTokensConverted;

          const decimalBalance = toDecimals(
            +balance[0].baseTokensConverted,
            pool.stakingToken.decimals,
          );
          const userShare = new BN(decimalBalance).div(new BN(pool.stakingToken.totalSupply));
          stakingPosition.stakingToken.balance = toDecimals(
            +balance[0].baseTokensConverted,
            pool.stakingToken.decimals,
          );
          stakingPosition.stakingToken.tokens.forEach((t) => {
            t.balance = userShare.toNumber() * t.reserve;
            t.value = t.price * t.balance;
          });

          stakingPosition.extra = undefined;
          baseDataStakingMap.get(balance[0].owner).items.push(stakingPosition);
        }
      }
    }

    return Array.from(baseDataStakingMap.values());
  }

  private async filterAndModificateBalances(
    pools: IntegrationStakingPositionDto[],
    balances: Map<string, userFarmData[]>,
    infoFarms: globalFarmData[],
  ): Promise<modifiedBalanceData[]> {
    const modifiedDataBalances = new Map<string, modifiedBalanceData>();
    const balancesMap = [];
    Array.from(balances).map(([address, b]) => {
      const list = b.map((a) => [address, a]);
      balancesMap.push(...list);
    });
    const poolByAQ = new Map(pools.map((p) => [p.extra.farm.aq?.account, p]));
    const poolByDD = new Map(pools.map((p) => [p.extra.farm.dd?.account, p]));

    for (const [address, balance] of balancesMap) {
      const pool: {
        aq?: IntegrationStakingPositionDto;
        dd?: IntegrationStakingPositionDto;
      } = {};

      pool.aq = poolByAQ.get(balance.globalFarm);
      pool.dd = poolByDD.get(balance.globalFarm);

      if (pool?.aq || pool?.dd) {
        const filteredFarmsInfo = infoFarms.find(
          (f) =>
            pool?.aq?.extra?.farm?.aq?.farmTokenMint === f.farmTokenMint ||
            pool?.dd?.extra?.farm?.dd?.farmTokenMint === f.farmTokenMint,
        );
        const keyName = concatStrings(address, pool.aq ? pool.aq?.address : pool.dd?.address);
        const balanceList = modifiedDataBalances.get(keyName);

        if (balanceList) {
          balanceList.balance.push(balance);
          balanceList.farm.push(filteredFarmsInfo);
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

  async filterAndModificateBalancesOld(
    pools: IntegrationStakingPositionDto[],
    balances: userFarmData[],
    infoFarms: globalFarmData[],
  ): Promise<modifiedBalanceData[]> {
    const modifiedDataBalances = new Map<string, modifiedBalanceData>();
    for (const b of balances) {
      let pool: IntegrationStakingPositionDto;
      let type: 'aq' | 'dd';
      for (const p of pools) {
        if (b.globalFarm === p.extra.farm.aq?.account) {
          pool = p;
          type = 'aq';
        } else if (b.globalFarm === p.extra.farm.dd?.account) {
          pool = p;
          type = 'dd';
        }
      }
      let mapInfoFarm: globalFarmData;
      for (const f of infoFarms) {
        if (pool.extra.farm[type]?.farmTokenMint === f.farmTokenMint) {
          mapInfoFarm = f;
        }
      }

      const check = modifiedDataBalances.get(concatStrings(b.owner, pool.address));
      if (!check) {
        modifiedDataBalances.set(concatStrings(b.owner, pool.address), {
          balance: [b],
          pool,
          farm: [mapInfoFarm],
        });
      } else {
        check.balance.push(b);
        check.farm.push(mapInfoFarm);
      }
    }
    return [...modifiedDataBalances.values()];
  }

  async getAccountGlobalFarms(farms: IntegrationStakingPositionDto[]): Promise<globalFarmData[]> {
    const options = {
      jsonrpc: '2.0',
      method: ['getAccountInfo', 'getTokenSupply'],
      encoding: 'jsonParsed',
    };
    const rpcDataRequests = [];
    let idRpc = 0;
    for (const farm of farms) {
      const { aq, dd } = farm.extra.farm;
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
      if (dd) {
        rpcDataRequests.push({
          jsonrpc: options.jsonrpc,
          id: idRpc + ':' + dd.account,
          method: options.method[0],
          params: [
            dd.account,
            {
              encoding: options.encoding,
            },
          ],
        });
        rpcDataRequests.push({
          jsonrpc: options.jsonrpc,
          id: idRpc + ':' + dd.farmTokenMint,
          method: options.method[1],
          params: [dd.farmTokenMint],
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

  async getAccountUserFarms(
    addresses: string[],
    farms: IntegrationStakingPositionDto[],
  ): Promise<Map<string, userFarmData[]>> {
    const options = {
      jsonrpc: '2.0',
      method: 'getAccountInfo',
      encoding: 'jsonParsed',
    };
    let idRpc = 0;
    const rpcDataRequests = [];
    for (const farm of farms) {
      const { aq, dd } = farm.extra.farm;
      for (const wallet of addresses) {
        if (aq) {
          const addressAQ = await findProgramAddress(aq.account, wallet);
          rpcDataRequests.push({
            jsonrpc: options.jsonrpc,
            id: idRpc + ':' + addressAQ.toBase58(),
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
            id: idRpc + ':' + addressDD.toBase58(),
            method: options.method,
            params: [
              addressDD.toBase58(),
              {
                encoding: options.encoding,
              },
            ],
          });
        }

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

    const filteredResponses = filterResponsesUserFarms(responses);

    return filteredResponses;
  }
}
