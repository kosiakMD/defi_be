// eslint-disable-next-line max-classes-per-file
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, ProtocolNameEnum } from '@app/common';
import {
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';

import { CallData } from '@app/common/dto/CallData';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';
import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { concatStrings } from '@app/common/utils';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { JobInterface } from '../job.interface';
import { Abis } from './abis/abis.common';
import { AbisEth } from './abis/abis.eth';
import BadgerAddresses from './addresses/addresses.ethereum';
import { DbMapping } from '../utils/dbmapping';

import { BadgerStaking } from './badger.staking';

@Injectable()
export class BadgerStakingEth extends BadgerStaking implements JobInterface {
  chain = ChainIdEnum.eth;
  feature = FeatureEnum.staking;
  protocol = ProtocolNameEnum.badger;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;
  abis = AbisEth;

  protected vaultsToCRVPools;
  protected vaultsToSushiPools;
  protected specialAddresses;

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

    // list of contracts which have special ABI
    this.specialAddresses = [
      this.addresses.crvPools.bcrvRenBTC.toLowerCase(),
      this.addresses.crvPools.bcrvSBTC.toLowerCase(),
    ];

    this.vaultsToCRVPools = this.mapVaultsToPools(this.addresses.crvPools);
    this.vaultsToSushiPools = this.mapVaultsToPools(this.addresses.sushiPools);
  }

  /** completed for masterchief contract */
  async buildInitialMapping(jobMapping: TrackedVault): Promise<TrackedVault> {
    this.logger.log('building initial mapping', this.placeholder);

    const stakingFeatures: IntegrationStakingPositionDto[] = [];
    await this.setConvexPoolInfo(stakingFeatures);

    const poolsInfo: Map<string, any> = await this.getAllPoolInfo();

    for (const [address, poolInfo] of poolsInfo.entries()) {
      try {
        const rewardAddress = poolInfo.reward;
        const vault = poolInfo.vault.toLowerCase();

        const accountTokenDto: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
          rewardAddress,
          this.chain,
        );
        
        const rewardToken = plainToClass(IntegrationClaimableTokenDto, {
          address: accountTokenDto.address,
          name: accountTokenDto.name,
          symbol: accountTokenDto.symbol,
          decimals: accountTokenDto.decimals,
        });

        const poolTokenData: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
          address,
          this.chain,
        );

        const stakingToken: IntegrationERC20TokenDto = plainToClass(IntegrationERC20TokenDto, {
          address: poolTokenData.address,
          name: poolTokenData.name,
          symbol: poolTokenData.symbol,
          decimals: poolTokenData.decimals,
        });

        const crvPool = this.vaultsToCRVPools.get(vault).pool;
        const sushiPool = this.vaultsToSushiPools.get(vault).pool;

        if (crvPool) {
          const abiVersion = this.specialAddresses.includes(crvPool) ? 'V1' : 'V2';
          const calls = new Map<string, CallData>();

          const tokenCount = (crvPool === BadgerAddresses.crvPools.bcrvTricrypto) || (crvPool === BadgerAddresses.crvPools.bcrvTricrypto2) ? 3 : 2;

          for (let i = 0; i < tokenCount; i++) {
            calls.set(this.getCoinLabel(address, i), {
              address: crvPool,
              abi: AbisEth['getCoin' + abiVersion],
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

          let tokens = [];

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
        } else if (sushiPool) {
          const calls = new Map<string, CallData>();
          
          calls.set(this.getTokenLabel(address, 0), {
            address: sushiPool,
            abi: AbisEth.getToken0,
            input: {
              data: [],
            },
            output: {},
          });
          calls.set(this.getTokenLabel(address, 1), {
            address: sushiPool,
            abi: AbisEth.getToken1,
            input: {
              data: [],
            },
            output: {},
          });
          
          let multicallRsp: Map<string, CallData> = await this.multicallService.handleInBatches(
            calls,
            this.chain,
          );

          for (let i = 0; i < 2; i++) {
            const tokenAddress = multicallRsp.get(this.getTokenLabel(address, i)).output.data.toString();
            const tokenData = await this.getTokenData(tokenAddress);
            const token = plainToClass(IntegrationPoolTokenDto, {
              address: tokenAddress,
              name: tokenData.name,
              symbol: tokenData.symbol,
              decimals: tokenData.decimals.toNumber(),
              positionInPool: i,
            });

            stakingToken.tokens.push(token);
          }
        } else if (poolTokenData.underlyingAssets) {
          stakingToken.tokens = [];
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
      if (stakingKey !== 'byvWBTC') {
        const settVault = this.addresses.settVaults[stakingKey].toLowerCase();
        const settStrategy = this.addresses.settStrategies[stakingKey].toLowerCase();

        const calls = new Map<string, CallData>();
        calls.set(this.getWantLabel(settStrategy), {
          address: settStrategy,
          abi: Abis.getWantAddress,
          input: {
            data: [],
          },
          output: {},
        });

        let multicallRsp: Map<string, CallData> = await this.multicallService.handleInBatches(
          calls,
          this.chain,
        );

        const wantAddress = multicallRsp.get(this.getWantLabel(settStrategy)).output.data.toLowerCase();
        const rewardAddress = BadgerAddresses.vaultToReward[stakingKey];

        const lpToken = this.addresses.stakingKeys[0] !== stakingKey ? wantAddress : settVault;

        poolsInfoMap.set(lpToken, {
          // covert to lower case once received!
          id: 0,
          lpToken,
          allocPoint: 0,
          lastRewardTimestamp: 0,
          reward: rewardAddress,
          vault: settVault,
        });
      }
    }

    return poolsInfoMap;
  }

  private async setConvexPoolInfo(stakingFeatures: IntegrationStakingPositionDto[]): Promise<void> {
    const rewardTokenData: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
      BadgerAddresses.vaultToReward.byvWBTC,
      this.chain,
    );
    
    const rewardToken = plainToClass(IntegrationClaimableTokenDto, {
      address: rewardTokenData.address,
      name: rewardTokenData.name,
      symbol: rewardTokenData.symbol,
      decimals: rewardTokenData.decimals,
    });

    const poolTokenData: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
      BadgerAddresses.settVaults.byvWBTC,
      this.chain,
    );

    const stakingToken: IntegrationERC20TokenDto = plainToClass(IntegrationERC20TokenDto, {
      address: poolTokenData.address,
      name: poolTokenData.name,
      symbol: poolTokenData.symbol,
      decimals: poolTokenData.decimals,
    });

    const underlyingTokenData: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
      BadgerAddresses.tokens.wBTC,
      this.chain,
    );

    const token = plainToClass(IntegrationPoolTokenDto, {
      address: underlyingTokenData.address,
      name: underlyingTokenData.name,
      symbol: underlyingTokenData.symbol,
      decimals: underlyingTokenData.decimals,
      positionInPool: 0,
    });

    stakingToken.tokens.push(token);

    const stakingPoolFeature: IntegrationStakingPositionDto = plainToClass(IntegrationStakingPositionDto, {
      address: BadgerAddresses.settVaults.byvWBTC,
      poolId: null,
      poolName: null,
      rewards: [rewardToken],
      stakingToken: stakingToken,
    });

    stakingFeatures.push(stakingPoolFeature);
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
      const sushiPool = this.vaultsToSushiPools.get(vaultAddress)?.pool;

      if (crvPool) {
        const abiVersion = this.specialAddresses.includes(crvPool) ? 'V1' : 'V2';

        const tokenCount = stakingPosition.stakingToken.tokens.length;
        
        for (let i = 0; i < tokenCount; i++) {
          calls.set(this.getCoinBalanceLabel(vaultAddress, i), {
            address: crvPool,
            abi: AbisEth['coinBalance' + abiVersion],
            input: {
              data: [i],
            },
            output: {},
          });
        }
      } else if (sushiPool) {
        calls.set(this.getReservesLabel(stakingPosition), {
          address: sushiPool,
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
    prices[this.addresses.tokens.imBTC] = prices[this.addresses.tokens.wBTC];
  }
}