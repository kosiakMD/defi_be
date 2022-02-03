import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
import { toDecimals } from 'apps/account_service/src/common/utils';
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
import { concatStrings, objToString } from '@app/common/utils';

import { Web3Provider } from '../../../chains/web3.provider';
import { LIMIT_DATA, ORCA_FARM_ID } from './orca.constant';
import { globalFarmData, modifiedBalanceData, userFarmData } from './orca.interface';
import { calculateRewards } from './orca.reward';
import { globalFarmStruct, userFarmStruct, uint256ToDecimal } from './orca.struct';
import { toChunkedArray } from '@app/common/utils/transform';

@Injectable()
export class OrcaStaking {
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
    const cacheKey = `${chain.id}_${OrcaProtocolEnum.orca}_${FeatureEnum.staking}`;
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
          feature: FeatureEnum.staking,
          items: [],
        }),
      ]),
    );

    const balances = await this.getAccountUserFarms(addresses, pools);
    const infoFarms = await this.getAccountGlobalFarms(pools);

    const filteredBalances = await this.filterAndModificateBalances(pools, balances, infoFarms);

    for (const b of filteredBalances) {
      const { pool, balance, farm } = b;
      const stakingPosition: IntegrationStakingPositionDto = cloneDeep(pool);
      const decimalBalance = toDecimals(
        +balance[0].baseTokensConverted,
        pool.stakingToken.decimals,
      );
      const userShare = new BN(decimalBalance).div(new BN(pool.stakingToken.totalSupply));
      stakingPosition.staked = balance[0].baseTokensConverted;
      stakingPosition.stakingToken.balance = toDecimals(
        +balance[0].baseTokensConverted,
        pool.stakingToken.decimals,
      );
      stakingPosition.stakingToken.tokens.forEach((t) => {
        t.balance = userShare.toNumber() * t.reserve;
        t.value = t.price * t.balance;
      });

      balance.forEach(async (bl, index) => {
        const reward = await calculateRewards(bl, farm[index]);
        stakingPosition.rewards[index].claimableData.balance = toDecimals(
          +reward,
          stakingPosition.rewards[index].decimals,
        );
        stakingPosition.rewards[index].claimableData.value =
          +stakingPosition.rewards[index].claimableData.balance *
          stakingPosition.rewards[index].price;
      });

      stakingPosition.extra = undefined;
      baseDataStakingMap.get(balance[0].owner).items.push(stakingPosition);
    }

    return Array.from(baseDataStakingMap.values());
  }

  async filterAndModificateBalances(
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
          id: idRpc,
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
          id: idRpc,
          method: options.method[1],
          params: [aq.farmTokenMint],
        });
        idRpc++;
      }
      if (dd) {
        rpcDataRequests.push({
          jsonrpc: options.jsonrpc,
          id: idRpc,
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
          id: idRpc,
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

    const filteredResponses = new Map();
    for (const response of responses) {
      if (response.result.value?.data) {
        const [data, encoding] = response.result.value.data;
        const decoded = globalFarmStruct.decode(Buffer.from(data, encoding));
        const decodedData = objToString(decoded);
        decodedData['cumulativeEmissionsPerFarmToken'] = uint256ToDecimal(
          decoded.cumulativeEmissionsPerFarmToken,
        );

        const gettedData = filteredResponses.get(response.id);
        if (!gettedData) {
          filteredResponses.set(response.id, decodedData);
        } else {
          filteredResponses.set(response.id, { ...gettedData, ...decodedData });
        }
      } else if (response.result.value?.amount) {
        const amountTokens = {
          totalDeposit: response.result.value?.amount,
        };
        const gettedData = filteredResponses.get(response.id);
        if (!gettedData) {
          filteredResponses.set(response.id, amountTokens);
        } else {
          gettedData.totalDeposit = response.result.value?.amount;
        }
      }
    }
    return [...filteredResponses.values()];
  }

  async findProgramAddress(account: string, wallet: string): Promise<PublicKey> {
    const [address] = await PublicKey.findProgramAddress(
      [
        new PublicKey(account).toBuffer(),
        new PublicKey(wallet).toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
      ],
      ORCA_FARM_ID,
    );
    return address;
  }

  async getAccountUserFarms(
    addresses: string[],
    farms: IntegrationStakingPositionDto[],
  ): Promise<userFarmData[]> {
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
          const addressAQ = await this.findProgramAddress(aq.account, wallet);
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
          const addressDD = await this.findProgramAddress(dd.account, wallet);
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

    const filteredResponses: userFarmData[] = [];
    for (const response of responses) {
      if (response.result.value) {
        const [data, encoding] = response.result.value.data;
        const decoded = userFarmStruct.decode(Buffer.from(data, encoding));
        const decodedData: any = objToString(decoded);
        decodedData.cumulativeEmissionsCheckpoint = uint256ToDecimal(
          decoded.cumulativeEmissionsCheckpoint,
        );
        filteredResponses.push(decodedData);
      }
    }
    return filteredResponses;
  }
}
