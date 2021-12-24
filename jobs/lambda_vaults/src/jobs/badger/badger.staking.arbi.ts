// eslint-disable-next-line max-classes-per-file
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, ProtocolNameEnum } from '@app/common';
import {
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';

import { CallData } from '@app/common/dto/CallData';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';
import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { concatStrings } from '@app/common/utils';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { JobInterface } from '../job.interface';
import { Abis } from './abis/abis.common';
import { AbisArbi } from './abis/abis.arbi';
import BadgerAddresses from './addresses/addresses.arbitrum';
import { DbMapping } from '../utils/dbmapping';

import { BadgerStaking } from './badger.staking';

@Injectable()
export class BadgerStakingArbi extends BadgerStaking implements JobInterface {
  chain = ChainIdEnum.arbi;
  feature = FeatureEnum.staking;
  protocol = ProtocolNameEnum.badger;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;
  abis = AbisArbi;

  protected vaultsToCRVPools;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly storeService: StoreService,
    protected readonly multicallService: MulticallAggregator,
    protected readonly priceService: PriceService,
  ) {
    super();
    this.dbMapping = new DbMapping(storeService);

    this.addresses = BadgerAddresses;

    this.vaultsToCRVPools = this.mapVaultsToPools(this.addresses.crvPools);
  }

  /** completed for masterchief contract */
  async buildInitialMapping(jobMapping: TrackedVault): Promise<TrackedVault> {
    this.logger.log('building initial mapping', this.placeholder);

    const stakingFeatures: IntegrationStakingPositionDto[] = [];

    const poolsInfo: Map<string, any> = await this.getAllPoolInfo();

    for (const [address, poolInfo] of poolsInfo.entries()) {
      try {
        const rewardAddress = poolInfo.reward;
        
        const [stakingToken, rewardToken, poolTokenData] = await this.saveTokens(address, rewardAddress);

        const vault = poolInfo.vault.toLowerCase();

        const crvPool = this.vaultsToCRVPools.get(vault).pool;
        if (crvPool) {
          const tokenCount = vault === this.addresses.settVaults.bcrvTricrypto.toLowerCase() ? 3 : 2;
          
          const calls = new Map<string, CallData>();

          for (let i = 0; i < tokenCount; i++) {
            calls.set(this.getCoinLabel(address, i), {
              address: crvPool,
              abi: AbisArbi.getCoin,
              input: {
                data: [i],
              },
              output: {},
            });
          }

          let multicallRsp: Map<string, CallData> = await this.multicallService.handleInBatches(
            calls,
            this.chain,
          );

          const tokens = [];

          for (let i = 0; i < tokenCount; i++) {
            const tokenAddress = multicallRsp.get(this.getCoinLabel(address, i)).output.data.toString();

            const tokenData = await this.getTokenData(tokenAddress);

            const token = plainToClass(IntegrationPoolTokenDto, {
              address: tokenAddress,
              name: tokenData.name,
              symbol: tokenData.symbol,
              decimals: tokenData.decimals.toNumber(),
              positionInPool: i,
            });

            tokens.push(token);
          }

          stakingToken.tokens.push(...tokens);
        } else if (poolTokenData.underlyingAssets) {
          poolTokenData.underlyingAssets.forEach((pt) => {
            const poolToken: IntegrationPoolTokenDto = plainToClass(IntegrationPoolTokenDto, {
              address: pt.address,
              name: pt.name,
              symbol: pt.symbol,
              decimals: pt.decimals,
              positionInPool: pt.positionInPool,
            });
            stakingToken.tokens.push(poolToken);
          });
        }
        
        const stakingPoolFeature: IntegrationStakingPositionDto = plainToClass(IntegrationStakingPositionDto, {
          address: vault,
          poolId: null,
          poolName: null,
          rewards: [rewardToken],
          stakingToken: stakingToken,
        });
        
        stakingFeatures.push(stakingPoolFeature);
      } catch (e) {
        this.logger.error(
          `error to get token data from account service, chain [${this.chain}], address [${address}]`,
          this.placeholder,
        );
      }
    }
    
    const mappings = [];
    for (let i = 0; i < stakingFeatures.length; i++) {
      mappings.push(await this.dbMapping.toDbMapping(stakingFeatures[i], this.chain));
    }
    
    jobMapping.mapping = mappings;
    
    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);
    return updatedMapping;
  }

  private async getAllPoolInfo(): Promise<Map<string, any>> {
    const poolsInfoMap: Map<string, any> = new Map<string, any>();

    for (let stakingKey of this.addresses.stakingKeys) {
      const settVault = this.addresses.settVaults[stakingKey];
      const settStrategy = this.addresses.settStrategies[stakingKey];

      const calls = new Map<string, CallData>();
      calls.set(this.getWantLabel(settStrategy), {
        address: settStrategy,
        abi: Abis.getWantAddress,
        input: {
          data: [],
        },
        output: {},
      });
      
      calls.set(this.getRewardAddressLabel(settStrategy), {
        address: settStrategy,
        abi: Abis.getRewardAddress,
        input: {
          data: [],
        },
        output: {},
      });

      const multicallRsp: Map<string, CallData> = await this.multicallService.handleInBatches(
        calls,
        this.chain,
      );

      const wantAddress = multicallRsp.get(this.getWantLabel(settStrategy)).output.data.toLowerCase();
      const rewardAddress = multicallRsp.get(this.getRewardAddressLabel(settStrategy)).output.data.toLowerCase();

      poolsInfoMap.set(wantAddress, {
        // covert to lower case once received!
        id: 0,
        lpToken: wantAddress,
        allocPoint: 0,
        lastRewardTimestamp: 0,
        reward: rewardAddress,
        vault: settVault,
      });
    }

    return poolsInfoMap;
  }

  getCallsForWant(
    stakingPosition: IntegrationStakingPositionDto
  ) {
    const calls: Map<string, CallData> = new Map<string, CallData>();
    const wantAddress = stakingPosition.stakingToken.address.toLowerCase();
    const vaultAddress = stakingPosition.address.toLowerCase();

    // reserves of lp token
    if (stakingPosition.stakingToken.tokens.length > 0) {
      const crvPool = this.vaultsToCRVPools.get(vaultAddress)?.pool;
      if (crvPool) {
        const tokenCount = stakingPosition.stakingToken.tokens.length;
        
        for (let i = 0; i < tokenCount; i++) {
          calls.set(this.getCoinBalanceLabel(vaultAddress, i), {
            address: crvPool,
            abi: AbisArbi.coinBalance,
            input: {
              data: [i],
            },
            output: {},
          });
        }
      } else {
        calls.set(this.getReservesLabel(stakingPosition), {
          address: wantAddress,
          abi: Abis.getReserves,
          input: {
            data: [],
          },
          output: {},
        });
      }

      // total supply supply of staking lp token
      calls.set(this.totalSupplyLabel(wantAddress), {
        address: wantAddress,
        abi: Abis.totalSupply,
        input: {
          data: [],
        },
        output: {},
      });
    }
    
    return calls;
  }

  protected removeZeroPrices(prices) {
    prices[this.addresses.tokens.ibBTC] = prices[this.addresses.tokens.wBTC];
  }
}