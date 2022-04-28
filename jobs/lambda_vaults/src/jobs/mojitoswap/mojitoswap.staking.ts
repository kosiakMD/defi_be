// eslint-disable-next-line max-classes-per-file
import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CurrencyIdEnum, FeatureEnum, ProtocolNameEnum, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import {
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';
import { concatStrings } from '@app/common/utils';
import { calcTokenPrice } from '@app/common/utils/price';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { toDecimals } from '../../utils/number';
import { isTimeToDo } from '../../utils/time';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { IntegrationDataConverter } from '../integration.data.converter';
import { JobBase } from '../job.base';
import { JobInterface } from '../job.interface';
import { calculateAPR } from '../utils/apr';
import { calculateAPY } from '../utils/apy';
import { DbMapping } from '../utils/dbmapping';
import { fillUnderlyingTokens } from '../utils/token';
import { MojitoswapAddresses } from './addresses';
import { AutostakingVaultAbis } from './contracts/autostaking.vault.abis';
import { MasterchefAbis } from './contracts/masterchef.abis';
import { VaultAbis } from './contracts/vault.abis';

@Injectable()
export class MojitoswapStaking
  extends JobBase<IntegrationStakingPositionDto>
  implements JobInterface
{
  chain = ChainIdEnum.kcc;
  feature = FeatureEnum.staking;
  protocol = ProtocolNameEnum.mojitoswap;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;

  protected mapping = [];
  private dbMapping;

  static blockTime = 3;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly storeService: StoreService,
    protected readonly multicallService: MulticallAggregator,
    protected readonly priceService: PriceService,
  ) {
    super();
    this.dbMapping = new DbMapping(storeService);
  }

  async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;

    if (
      !jobMapping.mapping ||
      isTimeToDo(jobMapping.updatedAt ?? jobMapping.createdAt, jobMapping.updateFrequency)
    ) {
      this.logger.log('it is time to update mapping', this.placeholder);
      jobMapping = await this.rebuildMapping(jobMapping);
    }

    jobMapping.mapping.forEach((jm) => {
      this.mapping.push(IntegrationDataConverter.toDTO(jm));
    });
  }

  /** completed for masterchief contract */
  async rebuildMapping(jobMapping: TrackedVault): Promise<TrackedVault> {
    this.logger.log('building initial mapping', this.placeholder);

    const stakingFeatures: IntegrationStakingPositionDto[] = [];

    const rewardTokenData: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
      MojitoswapAddresses.mjt,
      this.chain,
    );
    const rewardToken = plainToClass(IntegrationClaimableTokenDto, {
      address: rewardTokenData.address,
      name: rewardTokenData.name,
      symbol: rewardTokenData.symbol,
      decimals: rewardTokenData.decimals,
    });

    const poolsInfo: Map<string, any> = await this.getAllPoolsInfo(
      MojitoswapAddresses.masterContract,
    );

    await Promise.all(
      Array.from(poolsInfo.keys()).map(async (address) => {
        try {
          const poolTokenData: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
            poolsInfo.get(address).lpToken,
            this.chain,
          );

          const stakingToken: IntegrationERC20TokenDto = plainToClass(IntegrationERC20TokenDto, {
            address: poolTokenData.address,
            name: poolTokenData.name,
            symbol: poolTokenData.symbol,
            decimals: poolTokenData.decimals,
          });

          if (poolTokenData.underlyingAssets) {
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

          const stakingPoolFeature: IntegrationStakingPositionDto = plainToClass(
            IntegrationStakingPositionDto,
            {
              address:
                address === MojitoswapAddresses.autoStakingVault
                  ? MojitoswapAddresses.autoStakingVault
                  : MojitoswapAddresses.masterContract,
              poolId: poolsInfo.get(address).id?.toString(),
              poolName: null,
              rewards: [rewardToken],
              stakingToken: stakingToken,
            },
          );

          stakingFeatures.push(stakingPoolFeature);
        } catch (e) {
          this.logger.error(
            `error to get token data from account service, chain [${this.chain}], address [${address}]`,
            this.placeholder,
          );
        }
      }),
    );

    const mappings = await Promise.all(
      stakingFeatures.map(async (sf) => await this.dbMapping.toDbMapping(sf, this.chain)),
    );

    jobMapping.mapping = mappings;

    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);
    return updatedMapping;
  }

  private async getAllPoolsInfo(chiefContract: MojitoswapAddresses): Promise<Map<string, any>> {
    const masterchefContract = new MasterchefAbis(chiefContract);

    const call = new Map<string, CallData>();
    call.set(this.poolLengthLabel(chiefContract), masterchefContract.poolLength());

    const poolsInfo: Map<string, CallData> = await this.multicallService.handleInBatches(
      call,
      this.chain,
    );

    const poolLengthResult = Number(poolsInfo.get(this.poolLengthLabel(chiefContract)).output.data);

    const poolsInfoMap = new Map<string, any>();

    const calls = new Map<string, CallData>();
    for (let i = 0; i < poolLengthResult; i++) {
      const mappedDTO = plainToClass(IntegrationStakingPositionDto, {});
      mappedDTO.poolId = i;

      calls.set(this.poolInfoLabel(mappedDTO), masterchefContract.poolInfo(i));
    }

    const poolInfos = await this.multicallService.handleInBatches(calls, this.chain);

    let i = 0;
    poolInfos.forEach((poolInfo) => {
      poolsInfoMap.set(poolInfo.output.data.lpToken.toLowerCase(), {
        // covert to lower case once received!
        id: i,
        lpToken: poolInfo.output.data.lpToken.toLowerCase(),
        allocPoint: poolInfo.output.data.allocPoint,
        lastRewardBlock: poolInfo.output.data.lastRewardBlock,
        accMojitoPerShare: poolInfo.output.data.accMojitoPerShare,
      });

      i++;
    });

    // add autocompounding vault
    poolsInfoMap.set(MojitoswapAddresses.autoStakingVault.toLowerCase(), {
      id: null,
      lpToken: MojitoswapAddresses.mjt.toLowerCase(),
      allocPoint: 0,
      lastRewardBlock: 0,
      accMojitoPerShare: 0,
    });

    return poolsInfoMap;
  }

  async fillChainData(): Promise<any[]> {
    const batchCalls = [];

    this.mapping.forEach((m) => {
      if (m instanceof IntegrationStakingPositionDto) {
        batchCalls.push(...this.getCallsForPool(m, MojitoswapAddresses.masterContract).entries());
      }
    });
    batchCalls.push(...this.getCallsForChief(MojitoswapAddresses.masterContract).entries());
    const batchCallsMap = new Map<string, CallData>(batchCalls);

    const pricedTokenAddresses: string = Array.from(this.getPricedTokensSet()).join(',');

    const [{ prices }, multicallRsp] = await Promise.all([
      this.priceService.getCurrentPrices(pricedTokenAddresses, CurrencyIdEnum.usd, ChainIdEnum.kcc),
      this.multicallService.handleInBatches(batchCallsMap, ChainIdEnum.kcc),
    ]);

    // set price for tokens which have no prices on coingecko
    this.setPrices(multicallRsp, prices);

    const totalAllocPoint: BigNumber = multicallRsp.get(
      this.totalAllocPointLabel(MojitoswapAddresses.masterContract),
    ).output.data;
    const rewardPerBlock: BigNumber = multicallRsp.get(
      this.rewardPerBlockLabel(MojitoswapAddresses.masterContract),
    ).output.data;
    const rewardMultiplier: number = multicallRsp.get(
      this.rewardMultiplierLabel(MojitoswapAddresses.masterContract),
    ).output.data;

    this.mapping = this.mapping.reduce((mapping, sp) => {
      if (sp instanceof IntegrationStakingPositionDto) {
        sp = this.getDataFromMulticallRsp(multicallRsp, sp, prices);

        sp.rewards[0].price = Number(prices[sp.rewards[0].address]);

        const { allocPoint } = multicallRsp.get(this.poolInfoLabel(sp)).output.data;

        const stats = {
          totalAllocPoints: totalAllocPoint,
          poolAllocPoints: allocPoint,
          rewardTokenPerBlock:
            rewardMultiplier * toDecimals(rewardPerBlock, sp.rewards[0].decimals),
          rewardTokenPrice: sp.rewards[0].price,
          blockTime: MojitoswapStaking.blockTime,
          farmingPoolTVL: sp.stats.tvl,
        };

        if (sp.address.toLowerCase() !== MojitoswapAddresses.autoStakingVault) {
          sp.rewards[0].apr = calculateAPR(stats);
        } else {
          stats.farmingPoolTVL =
            toDecimals(
              multicallRsp.get(MojitoswapAddresses.autoStakingVault).output.data,
              sp.stakingToken.decimals,
            ) * sp.stakingToken.price;

          sp.rewards[0].apy = calculateAPY(stats).toNumber();
        }

        return [...mapping, sp];
      }
      return mapping;
    }, []);

    return this.mapping;
  }

  private setPrices(multicallRsp, prices) {
    this.mapping.forEach((stakingPos) => {
      if (stakingPos.stakingToken.tokens.length === 2) {
        const { _reserve0, _reserve1 } = multicallRsp.get(this.getReservesLabel(stakingPos)).output
          .data;

        stakingPos.stakingToken.tokens.forEach((t, i, tokens) => {
          t.price =
            Number(prices[t.address]) === 0
              ? calcTokenPrice(
                  [_reserve0, _reserve1],
                  t.positionInPool,
                  prices[tokens[(i + 1) % 2].address]?.toString(),
                )
              : Number(prices[t.address]);
          prices[t.address.toLowerCase()] = prices[t.address.toLowerCase()] ?? t.price.toString();
        });
      }
    });
  }

  private getDataFromMulticallRsp(multicallRsp, stakingPos: IntegrationStakingPositionDto, prices) {
    const balance: BigNumber = multicallRsp.get(this.balanceOfLabel(stakingPos)).output.data;
    stakingPos.staked = toDecimals(balance, stakingPos.stakingToken.decimals).toString();
    stakingPos.stakingToken.balance = toDecimals(balance, stakingPos.stakingToken.decimals);

    // m.p
    if (stakingPos.stakingToken.tokens.length === 2) {
      const totalSupply: BigNumber = multicallRsp.get(this.totalSupplyLabel(stakingPos)).output
        .data;
      stakingPos.stakingToken.totalSupply = toDecimals(
        totalSupply,
        stakingPos.stakingToken.decimals,
      );
      const poolShare = stakingPos.stakingToken.balance / stakingPos.stakingToken.totalSupply;
      const { _reserve0, _reserve1 } = multicallRsp.get(this.getReservesLabel(stakingPos)).output
        .data;

      stakingPos.stats.tvl = fillUnderlyingTokens(
        stakingPos.stakingToken.tokens,
        [_reserve0, _reserve1],
        prices,
        poolShare,
      );
    } else {
      stakingPos.stakingToken.price = Number(prices[stakingPos.stakingToken.address]);
      stakingPos.stakingToken.value =
        stakingPos.stakingToken.balance * stakingPos.stakingToken.price;
      stakingPos.stats.tvl += stakingPos.stakingToken.value;
    }
    return stakingPos;
  }

  private getCallsForPool(
    stakingPosition: IntegrationStakingPositionDto,
    chiefContract: MojitoswapAddresses,
  ) {
    const calls = new Map<string, CallData>();
    const masterContract = new MasterchefAbis(chiefContract);

    if (stakingPosition.address.toLowerCase() !== MojitoswapAddresses.autoStakingVault) {
      const stakingTokenContract = new VaultAbis(stakingPosition.stakingToken.address);

      // reserves of lp token
      if (stakingPosition.stakingToken.tokens.length === 2) {
        calls.set(this.getReservesLabel(stakingPosition), stakingTokenContract.getReserves());

        // total supply supply of staking lp token
        calls.set(this.totalSupplyLabel(stakingPosition), stakingTokenContract.totalSupply());
      }

      // balance of lp token on masterchief contract
      calls.set(
        this.balanceOfLabel(stakingPosition),
        stakingTokenContract.balanceOf(chiefContract),
      );

      // poolInfo to calculate APR
      calls.set(
        this.poolInfoLabel(stakingPosition),
        masterContract.poolInfo(stakingPosition.poolId),
      );
    } else {
      const stakingTokenContract = new AutostakingVaultAbis(MojitoswapAddresses.autoStakingVault);
      const mjtVaultContract = new VaultAbis(MojitoswapAddresses.mjt);

      calls.set(this.balanceOfLabel(stakingPosition), stakingTokenContract.balanceOf());
      calls.set(MojitoswapAddresses.autoStakingVault, mjtVaultContract.balanceOf(chiefContract));

      calls.set(this.poolInfoLabel(stakingPosition), masterContract.poolInfo(0));
    }

    return calls;
  }

  private getCallsForChief(chiefContract: MojitoswapAddresses) {
    const masterContract = new MasterchefAbis(chiefContract);
    return new Map<string, CallData>([
      [this.totalAllocPointLabel(chiefContract), masterContract.totalAllocPoint()],
      [this.rewardPerBlockLabel(chiefContract), masterContract.rewardPerBlock()],
      [this.rewardMultiplierLabel(chiefContract), masterContract.bonusMultiplier()],
    ]);
  }

  private getPricedTokensSet(): Set<string> {
    const addressesSet: Set<string> = new Set<string>();
    this.mapping.forEach((m) => {
      if (m instanceof IntegrationStakingPositionDto) {
        if (m.stakingToken.tokens.length === 2) {
          m.stakingToken.tokens.forEach((t) => {
            addressesSet.add(t.address);
          });
        }
      } else {
        addressesSet.add(m.stakingToken.address);
      }

      m.rewards.forEach((r) => {
        addressesSet.add(r.address);
      });
    });
    return addressesSet;
  }

  private getReservesLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(VaultAbis.getReserves.name, stakingPosition.stakingToken.address);
  }

  private totalSupplyLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(VaultAbis.totalSupply.name, stakingPosition.stakingToken.address);
  }

  private balanceOfLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(
      VaultAbis.balanceOf.name,
      stakingPosition.stakingToken.address,
      stakingPosition.address,
    );
  }

  private poolInfoLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(
      MasterchefAbis.poolInfo.name,
      MojitoswapAddresses.masterContract,
      stakingPosition.poolId,
    );
  }

  private totalAllocPointLabel(chiefContract: MojitoswapAddresses) {
    return concatStrings(MasterchefAbis.totalAllocPoint.name, chiefContract);
  }

  private rewardPerBlockLabel(chiefContract: MojitoswapAddresses) {
    return concatStrings(MasterchefAbis.rewardPerBlock.name, chiefContract);
  }

  private poolLengthLabel(chiefContract: MojitoswapAddresses) {
    return concatStrings(MasterchefAbis.poolLength.name, chiefContract);
  }

  private rewardMultiplierLabel(chiefContract: MojitoswapAddresses) {
    return concatStrings(MasterchefAbis.bonusMultiplier.name, chiefContract);
  }
}
