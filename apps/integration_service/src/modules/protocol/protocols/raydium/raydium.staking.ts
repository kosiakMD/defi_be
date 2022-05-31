import { Connection, PublicKey } from '@solana/web3.js';
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
  RaydiumProtocolEnum,
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { RaydiymFarm } from '@app/common/jobs/raydiym.farm';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { decimalsDivider, keepSolAddresses } from '@app/common/utils';

import { Web3Provider } from '../../../chain/web3.provider';

@Injectable()
export class RaydiumStaking {
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
    addresses = keepSolAddresses(addresses);
    if (addresses.length === 0) {
      return [];
    }
    const cacheKey = `${chain.id}_${RaydiumProtocolEnum.raydium}_${FeatureEnum.staking}`;
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
          projectName: RaydiumProtocolEnum.raydium,
          feature: FeatureEnum.staking,
          items: [],
        }),
      ]),
    );

    const balances = await this.getBalances(addresses, [
      RaydiymFarm.version3.programId,
      RaydiymFarm.version5.programId,
    ]);

    for (const b of balances) {
      const vault = cachedPoolsMap.get(b.poolId);
      // TODO: add fusion (version 5 vaults here)
      if (!vault || (new BN(b.depositBalance).isZero() && new BN(b.rewardDebt).isZero())) continue;

      const stakingPosition: IntegrationStakingPositionDto = cloneDeep(vault);
      const balance = new BN(b.depositBalance).div(decimalsDivider(vault.stakingToken.decimals));
      const userShare = balance.div(new BN(vault.stakingToken.totalSupply));
      stakingPosition.staked = b.depositBalance.toString();
      stakingPosition.stakingToken.balance = balance.toNumber();
      stakingPosition.stakingToken.tokens.forEach((t) => {
        t.balance = userShare.toNumber() * t.reserve;
        t.value = t.price * t.balance;
      });
      stakingPosition.rewards[0].claimableData.balance = getPendingValueV3(
        stakingPosition,
        b.rewardDebt,
      );
      stakingPosition.rewards[0].claimableData.value =
        stakingPosition.rewards[0].claimableData.balance * stakingPosition.rewards[0].price;
      stakingPosition.extra = undefined;
      baseDataStakingMap.get(b.stakerOwner).items.push(stakingPosition);
    }

    return Array.from(baseDataStakingMap.values());
  }

  // TODO: this approach works a bit slow for more then 2 addresses
  // TODO: need to cache all account balances in cache and get balance from it
  private async getBalances(addresses: Address[], programs: string[]) {
    const options = {
      jsonrpc: '2.0',
      method: 'getProgramAccounts',
      offset: 40,
      encoding: 'base64',
    };
    const addressesFilters = addresses.map((a) => {
      return {
        memcmp: {
          bytes: new PublicKey(a).toBase58(),
          offset: options.offset,
        },
      };
    });
    const payloadIndexData: { programId; userAddress }[] = [];
    const requestPayload = [];
    programs.forEach((p) => {
      const programId = new PublicKey(p).toBase58();
      addressesFilters.forEach((af) => {
        requestPayload.push({
          jsonrpc: options.jsonrpc,
          method: options.method,
          id: payloadIndexData.length,
          params: [
            programId,
            {
              filters: [af],
              encoding: options.encoding,
            },
          ],
        });
        payloadIndexData.push({
          programId: programId,
          userAddress: af.memcmp.bytes,
        });
      });
    });

    const rpcResponse = await this.httpService
      .post(this.rpcUrl, requestPayload)
      .pipe(map((response) => response.data))
      .toPromise();

    const balances: StakeBalance[] = [];
    rpcResponse.forEach((item) => {
      const indexData = payloadIndexData[item.id];
      item.result.forEach((res) => {
        const decoded = this.decodeAccountData(res.account.data, indexData.programId);
        balances.push({
          state: decoded.state,
          poolId: decoded.poolId.toString(),
          stakerOwner: decoded.stakerOwner.toString(),
          depositBalance: decoded.depositBalance,
          rewardDebt: decoded.rewardDebt,
          rewardDebtB: decoded.rewardDebtB,
          programId: indexData.programId,
        });
      });
    });

    return balances;
  }

  private decodeAccountData(data: string[], programId: string) {
    let layout;
    switch (programId) {
      case RaydiymFarm.version3.programId:
        layout = RaydiymFarm.version3.userInfoLayout;
        break;
      case RaydiymFarm.version4.programId:
        layout = RaydiymFarm.version4.userInfoLayout;
        break;
      case RaydiymFarm.version5.programId:
        layout = RaydiymFarm.version5.userInfoLayout;
        break;
      default:
        return null;
    }

    return layout.decode(Buffer.from(data[0], 'base64'));
  }
}

interface StakeBalance {
  state: BN;
  poolId: string;
  programId: string;
  stakerOwner: string;
  depositBalance: BN;
  rewardDebt: BN;
  rewardDebtB: BN;
}

function getPendingValueV3(stakingPosition: IntegrationStakingPositionDto, rewardDebt): number {
  const balanceBN = new BN(stakingPosition.stakingToken.balance);
  const rewardPerShareBN = new BN(stakingPosition.extra.farmInfo.rewardPerShareNet).div(
    decimalsDivider(9),
  );
  const rewardDebtBN = new BN(rewardDebt).div(decimalsDivider(stakingPosition.rewards[0].decimals));
  return balanceBN
    .multipliedBy(rewardPerShareBN) //
    .minus(rewardDebtBN)
    .toNumber();
}
