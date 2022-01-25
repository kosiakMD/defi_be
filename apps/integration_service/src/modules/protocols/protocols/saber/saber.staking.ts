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
  ProtocolTypeEnum,
  SaberProtocolEnum,
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { objToString, toChunkedArray } from '@app/common/utils';

import { Web3Provider } from '../../../chains/web3.provider';
import { requestPerChunk, programId } from './saber.constant';
import { balance } from './saber.interface';
import { balanceStruct, quarryMineStruct } from './saber.struct';
import { calculateReward } from './utils/saber.reward';

@Injectable()
export class SaberStaking {
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
    const cacheKey = `${chain.id}_${SaberProtocolEnum.saber}_${FeatureEnum.staking}`;
    const cachedPools: NotifyStaking = await this.cache.get(cacheKey);
    if (!cachedPools) {
      throw new Error(`not found cached data for key '${cacheKey}'`);
    }
    const cachedPoolsMap = new Map<string, IntegrationStakingPositionDto>(
      cachedPools.items.map((cpi) => [cpi.address.toString(), cpi]),
    );

    const baseDataStakingMap: Map<string, BaseDataStaking> = new Map<string, BaseDataStaking>(
      addresses.map((a) => [
        a,
        plainToClass(BaseDataStaking, {
          chain: chain,
          userAddress: a,
          protocolType: ProtocolTypeEnum.staking,
          projectName: SaberProtocolEnum.saber,
          feature: FeatureEnum.staking,
          items: [],
        }),
      ]),
    );

    const balances = await this.getBalance(addresses);
    const infoQuarry = await this.getQuarryInfo(balances.map((b) => b.quarryKey));

    for (const b of balances) {
      const vault = cachedPoolsMap.get(b.quarryKey);
      if (!vault) {
        continue;
      }
      const stakingPosition: IntegrationStakingPositionDto = cloneDeep(vault);
      const balance = toDecimals(+b.balance, vault.stakingToken.decimals);
      const userShare = new BN(balance).div(new BN(vault.stakingToken.totalSupply));

      stakingPosition.staked = b.balance;
      stakingPosition.stakingToken.balance = balance;
      stakingPosition.stakingToken.tokens.forEach((t) => {
        t.balance = userShare.toNumber() * t.reserve;
        t.value = t.price * t.balance;
      });

      stakingPosition.rewards[0].claimableData.balance = calculateReward(infoQuarry, b, vault);
      stakingPosition.rewards[0].claimableData.value =
        +stakingPosition.rewards[0].claimableData.balance * stakingPosition.rewards[0].price;
      stakingPosition.extra = undefined;
      baseDataStakingMap.get(b.authority).items.push(stakingPosition);
    }

    return Array.from(baseDataStakingMap.values());
  }

  private async getBalance(addresses: string[]): Promise<balance[]> {
    const options = {
      jsonrpc: '2.0',
      method: 'getProgramAccounts',
      offset: 40,
      encoding: 'base64',
    };

    const dataRequests = addresses.map((a, index) => {
      return {
        jsonrpc: options.jsonrpc,
        method: options.method,
        id: index,
        params: [
          programId,
          {
            filters: [
              {
                memcmp: {
                  bytes: new PublicKey(a).toBase58(),
                  offset: options.offset,
                },
              },
            ],
            encoding: options.encoding,
          },
        ],
      };
    });

    const chunks = toChunkedArray(dataRequests, requestPerChunk);

    const responses = [];
    for (const chunk of chunks) {
      const rpcResponse = await this.httpService
        .post(this.rpcUrl, chunk)
        .pipe(map((response) => response.data))
        .toPromise();

      responses.push(...rpcResponse);
    }

    const balances: balance[] = [];
    responses.forEach((item) => {
      item.result.forEach((res: any) => {
        const [data, encoding] = res.account.data;
        const decoded: any = balanceStruct.decode(Buffer.from(data, encoding));

        balances.push({
          quarryKey: decoded.quarryKey.toBase58(),
          authority: decoded.authority.toBase58(),
          totalValueKey: decoded.totalValueKey.toBase58(),
          rewardsEarned: decoded.rewardsEarned.toString(),
          rewardsPerTokenPaid: decoded.rewardsPerTokenPaid.toString(),
          balance: decoded.balance.toString(),
        });
      });
    });

    return balances;
  }

  private async getQuarryInfo(keys: string[]) {
    const options = {
      jsonrpc: '2.0',
      method: 'getAccountInfo',
      encoding: 'base64',
    };

    const requestsData = keys.map((key, index) => ({
      jsonrpc: options.jsonrpc,
      id: index,
      method: options.method,
      params: [
        key,
        {
          encoding: options.encoding,
        },
      ],
    }));

    const chunks = toChunkedArray(requestsData, requestPerChunk);

    const responces = [];
    for (const chunk of chunks) {
      const requests = await this.httpService
        .post(this.rpcUrl, chunk)
        .pipe(map((response) => response.data))
        .toPromise();

      responces.push(...requests);
    }

    const decodedResponces = responces.map((r) => {
      const [data, encoding] = r.result.value.data;
      const decoded = quarryMineStruct.decode(Buffer.from(data, encoding));
      return {
        id: r.id,
        data: objToString(decoded),
      };
    });

    return decodedResponces;
  }
}
