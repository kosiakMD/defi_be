import { LCDClient } from '@terra-money/terra.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, FeatureEnum, Logger, ProjectEnum, ProtocolTypeEnum } from '@app/common';
import { BaseData } from '@app/common/dto/base-data';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import {
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';
import { Web3ProviderService } from '@app/common/web3provider';

import { Asset } from '../../../../common/interfaces/transactions.interfaces';
import { toDecimals } from '../../../../common/utils/util';

import { AccountService } from '../../../microservice/account.service';
import { StaderAddresses } from './stader.addresses';

@Injectable()
export class StaderStaking {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly accountService: AccountService,
    private readonly web3Service: Web3ProviderService,
  ) {}

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const provider: LCDClient = this.web3Service.getInstanceByChainId(chain.id);
    const [balances, shBalances] = await Promise.all([
      this.getStakingBalances(addresses, provider),
      this.getWhSdStakedBalance(addresses, provider),
    ]);

    const lunaToken = await this.accountService.getTrackedAssets(StaderAddresses.luna, chain.id);
    const poolsInfoMap = await this.getPoolsInformation(
      new Set(
        Array.from(balances.values()).flatMap((userBalances) => {
          return userBalances.map((balanceData) => balanceData.poolId);
        }),
      ),
      provider,
    );

    const baseDataStakingMap: Map<string, BaseDataStaking[]> = new Map(
      addresses.map((a) => [
        a,
        [
          this.getStakingBaseData(a, chain, FeatureEnum.nativeStaking),
          this.getStakingBaseData(a, chain, FeatureEnum.staking),
        ],
      ]),
    );

    shBalances?.forEach((value, key) => {
      const mapItem = balances.get(key);
      mapItem ? mapItem.push(value) : balances.set(key, [value]);
    });

    const { data } = await this.accountService.getAssets(
      [StaderAddresses.luna, StaderAddresses.whSd],
      [chain.id],
    );

    const dbTokensMap: Map<string, Asset> = data.reduce((resp, token) => {
      resp.set(token.address, token);
      return resp;
    }, new Map());

    for (const [key, value] of balances) {
      const [nativeStaking, staking] = baseDataStakingMap.get(key);
      value.map((stakingData) => {
        const poolInfo = poolsInfoMap.get(stakingData.poolId);
        const stakingPosition = this.getStakingPosition(
          poolInfo,
          dbTokensMap.get(stakingData.token),
        );
        const stakedAmountDec = toDecimals(
          stakingData.stakingBalance,
          stakingPosition.stakingToken.decimals,
        );
        stakingPosition.staked = String(stakedAmountDec);
        stakingPosition.stakingToken.balance = stakedAmountDec;
        stakingPosition.stakingToken = {
          ...stakingPosition.stakingToken,
          balance: stakedAmountDec,
          price: null,
          value: null,
        };

        stakingPosition.rewards?.forEach((reward) => {
          reward.claimableData = {
            balance: toDecimals(stakingData.reward, lunaToken.decimals),
            value: null,
          };
          reward.price = null;
        });

        stakingPosition.stakingToken.address === StaderAddresses.luna
          ? nativeStaking.items.push(stakingPosition)
          : staking.items.push(stakingPosition);
      });
    }
    return Array.from(baseDataStakingMap.values()).flat();
  }

  async getPoolsInformation(poolsId: Set<number>, provider: LCDClient) {
    const poolsInfoMap = new Map();
    await Promise.all(
      Array.from(poolsId).map(async (id) => {
        const {
          pool: { name, active, staked },
        } = await provider.wasm.contractQuery(StaderAddresses.blueChip, {
          pool: {
            // eslint-disable-next-line camelcase
            pool_id: id,
          },
        });
        poolsInfoMap.set(id, { name, active, staked, id });
      }),
    );
    return poolsInfoMap;
  }

  getStakingPosition(
    poolsInfo: { name; active; staked; id },
    dbToken: Asset,
  ): IntegrationStakingPositionDto {
    const stakingToken: IntegrationERC20TokenDto = plainToClass(IntegrationERC20TokenDto, {
      address: dbToken.address,
      name: dbToken.name,
      symbol: dbToken.symbol,
      decimals: dbToken.decimals,
    });

    return plainToClass(IntegrationStakingPositionDto, {
      address:
        dbToken.address === StaderAddresses.luna
          ? StaderAddresses.staderDelegator
          : StaderAddresses.whSdStaker,
      poolId: poolsInfo?.id ?? null,
      poolName: poolsInfo?.name ?? dbToken.symbol,
      rewards:
        dbToken.address === StaderAddresses.luna
          ? [
              plainToClass(IntegrationClaimableTokenDto, {
                address: dbToken.address,
                name: dbToken.name,
                symbol: dbToken.symbol,
                decimals: dbToken.decimals,
              }),
            ]
          : [],
      stakingToken: stakingToken,
    });
  }

  async getWhSdStakedBalance(
    addresses: string[],
    provider: LCDClient,
  ): Promise<Map<string, StakingData>> {
    const whStakedMap = new Map<string, StakingData>();
    await Promise.all(
      addresses.map(async (address) => {
        // eslint-disable-next-line camelcase
        const { user_info } = await provider.wasm.contractQuery(StaderAddresses.whSdStaker, {
          // eslint-disable-next-line camelcase
          user_info: {
            address: address,
          },
        });
        // eslint-disable-next-line camelcase
        if (Number(user_info.sd_token_amount) > 0) {
          whStakedMap.set(address, {
            // eslint-disable-next-line camelcase
            stakingBalance: String(user_info.sd_token_amount),
            token: StaderAddresses.whSd,
          });
        }
      }),
    );
    return whStakedMap;
  }

  private async getStakingBalances(
    addresses: string[],
    provider: LCDClient,
  ): Promise<Map<string, StakingData[]>> {
    try {
      const balanceMap = new Map<string, StakingData[]>();

      await Promise.all(
        addresses.map(async (address) => {
          const { info } = await provider.wasm.contractQuery(StaderAddresses.staderDelegator, {
            user: {
              // eslint-disable-next-line camelcase
              user_addr: address,
            },
          });
          // eslint-disable-next-line camelcase
          info?.map(({ pool_id, deposit, pending_rewards }) => {
            const mapItem = balanceMap.get(address);
            const balanceObj: StakingData = {
              stakingBalance: String(deposit.staked),
              reward: String(pending_rewards),
              // eslint-disable-next-line camelcase
              poolId: pool_id,
              token: StaderAddresses.luna,
            };
            mapItem ? mapItem.push(balanceObj) : balanceMap.set(address, [balanceObj]);
          });
        }),
      );
      return balanceMap;
    } catch (e) {
      this.logger.error(e, 'getStakingBalances');
    }
  }

  getStakingBaseData(address: string, chain: ChainDto, feature: string) {
    return plainToClass(BaseDataStaking, {
      chain: chain,
      userAddress: address,
      protocolType: ProtocolTypeEnum[feature],
      projectName: ProjectEnum.stader,
      feature: FeatureEnum[feature],
      items: [],
    });
  }
}

export interface StakingData {
  stakingBalance: string;
  token: string;
  reward?: string;
  poolId?: number;
}
