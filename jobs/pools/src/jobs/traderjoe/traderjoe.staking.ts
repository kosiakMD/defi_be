// eslint-disable-next-line max-classes-per-file
import BigNumber from 'bignumber.js';
import { classToPlain, plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CallData } from '../../chain/dto/call.data';
import { MasterchiefPoolInfoTraderJoeResponse } from '../../chain/dto/token';
import { MulticallService } from '../../chain/multicall.service';
import { Web3Provider } from '../../chain/web3.provider';
import { ChainIdEnum, CurrencyIdEnum } from '../../config/enum';
import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { TrackedVaultItem } from '../../store/tracked.vault.item.entity';
import { toDecimals } from '../../utils/number';
import { concatStrings } from '../../utils/string';
import { TrackedVaultItemsMap } from '../data/tracked.vault.items.map';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { ERC20Token } from '../dto/common';
import { DbMapping } from './dbmapping';
import {
  APRStats,
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
  StakingFeatureMapping,
} from '../dto/staking.dto';
import { IntegrationDataConverter } from '../integration.data.converter';
import { JobInterface } from '../job.interface';
import { Abis } from './abis';
import { TraderjoeAddresses } from './addresses';

@Injectable()
export class TraderJoeStaking implements JobInterface {
  chain = ChainIdEnum.avax;
  feature = 'staking';
  protocol = 'TraderJoe';
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;

  private mapping = [];
  private dbMapping;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly web3Provider: Web3Provider,
    private readonly accountService: AccountService,
    private readonly storeService: StoreService,
    private readonly multicallService: MulticallService,
    private readonly priceService: PriceService,
  ) {
    this.dbMapping = new DbMapping(storeService);
  }

  async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;
    jobMapping = await this.buildInitialMapping(jobMapping);
    /*
    if (!jobMapping.mapping) {
      jobMapping = await this.buildInitialMapping(jobMapping);
    }*/
    //console.log(jobMapping)
    jobMapping.mapping.forEach((jm) => {
      this.mapping.push(IntegrationDataConverter.toDTO(jm));
    });
  }

  /** completed for masterchief contract */
  //async buildInitialMapping(jobMapping: TrackedVault): Promise<TrackedVault> {
  async buildInitialMapping(jobMapping: TrackedVault): Promise<any> {
    this.logger.log('building initial mapping', this.placeholder);

    const stakingFeatures: IntegrationStakingPositionDto[] = [];

    const accountTokenDto: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
      TraderjoeAddresses.joe,
      this.chain,
    );
    const rewardToken = plainToClass(IntegrationClaimableTokenDto, {
      address: accountTokenDto.address,
      name: accountTokenDto.name,
      symbol: accountTokenDto.symbol,
      decimals: accountTokenDto.decimals,
    });

    
    const poolsInfo: Map<string, MasterchiefPoolInfoTraderJoeResponse> = await this.getAllPoolInfo();
    
    for (const address of poolsInfo.keys()) {
      try {
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
            address: TraderjoeAddresses.chiefV2,
            poolId: poolsInfo.get(address).id.toString(),
            poolName: null,
            rewardToken: rewardToken,
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
    }

    const mappings = [];
    for (let i = 0; i < stakingFeatures.length; i++) {
      mappings.push(await this.dbMapping.toDbMapping(stakingFeatures[i], this.chain));
    }

    jobMapping.mapping = mappings;
    
    //const updatedMapping = await this.storeService.updateMapping(jobMapping);
    //TrackedVaultsMap.add(updatedMapping);
    //return updatedMapping;
    return jobMapping;
  }

  private async getAllPoolInfo(): Promise<Map<string, MasterchiefPoolInfoTraderJoeResponse>> {
    const call = new Map<string, CallData>();
    call.set(this.poolLengthLabel(), {
      address: TraderjoeAddresses.chiefV2,
      abi: Abis.poolLength,
      input: {
        data: [],
      },
      output: {},
    });

    const poolsInfo: Map<string, CallData> = await this.multicallService.handleInBatches(call, this.chain);

    let poolLengthResult = parseInt(poolsInfo.values().next().value.output.plain, 16);

    const poolsInfoMap: Map<string, MasterchiefPoolInfoTraderJoeResponse> = new Map<
      string,
      MasterchiefPoolInfoTraderJoeResponse
    >();

    const calls = new Map<string, CallData>();
    for (let i = 0; i < poolLengthResult; i++) {
      const mappedDTO = plainToClass(IntegrationStakingPositionDto, {});
      mappedDTO.poolId = i;

      calls.set(
        this.poolInfoLabel(mappedDTO), {
          address: TraderjoeAddresses.chiefV2,
          abi: Abis.poolInfoV2,
          input: {
            data: [i],
          },
          output: {},
        }
      );
    }

    let poolInfos = await this.multicallService.handleInBatches(calls, this.chain);
    
    let i = 0;
    for (let poolInfo of poolInfos.values()) {
      poolsInfoMap.set(poolInfo.output.data.lpToken.toLowerCase(), {
        // covert to lower case once received!
        id: i,
        lpToken: poolInfo.output.data.lpToken.toLowerCase(),
        allocPoint: poolInfo.output.data.allocPoint,
        lastRewardTimestamp: poolInfo.output.data.lastRewardTimestamp,
        accJoePerShare: poolInfo.output.data.accJoePerShare,
      });
      //console.log('V2 ' + poolInfo.output.data.allocPoint.toString())

      i++;
    }

    return poolsInfoMap;
  }

  async updateTracked(): Promise<void> {
    //console.log('update existed tracking pools, just compare max pool id');
  }

  async updateWithChainData(): Promise<any[]> {
    let batchCallsMap: Map<string, CallData> = new Map<string, CallData>();
    //this.logger.log(this.mapping);
    this.mapping.forEach((m) => {
      if (m instanceof IntegrationStakingPositionDto) {
        batchCallsMap = new Map<string, CallData>([
          ...batchCallsMap.entries(),
          ...this.getCallsForPool(m).entries(),
        ]);
      }
    });
    batchCallsMap = new Map<string, CallData>([
      ...batchCallsMap.entries(),
      ...this.getCallsForChief().entries(),
    ]);

    const pricedTokenAddresses: string = Array.from(this.getPricedTokensSet()).join(',');
    
    const [{ prices }, multicallRsp] = await Promise.all([
      this.priceService.getCurrentPrices(pricedTokenAddresses, CurrencyIdEnum.usd, ChainIdEnum.avax),
      this.multicallService.handleInBatches(batchCallsMap, ChainIdEnum.avax),
    ]);
    //console.log(multicallRsp)
    
    const totalAllocPoint: BigNumber = multicallRsp.get(this.totalAllocPointLabel()).output.data;
    const joePerBlock: BigNumber = multicallRsp.get(this.joePerBlockLabel()).output.data;

    this.mapping = this.mapping.map((m) => {
      if (m instanceof IntegrationStakingPositionDto) {
        const balance: BigNumber = multicallRsp.get(this.balanceOfLabel(m)).output.data;
        m.staked = toDecimals(balance, m.stakingToken.decimals);
        m.stakingToken.balance = toDecimals(balance, m.stakingToken.decimals);

        // m.p
        if (m.stakingToken.tokens.length === 2) {
          const totalSupply: BigNumber = multicallRsp.get(this.totalSupplyLabel(m)).output.data;
          m.stakingToken.totalSupply = toDecimals(totalSupply, m.stakingToken.decimals);
          const poolShare = m.stakingToken.balance / m.stakingToken.totalSupply;
          const { _reserve0, _reserve1 } = multicallRsp.get(this.getReservesLabel(m)).output.data;
          m.stakingToken.tokens.map((t) => {
            t.reserve =
              t.positionInPool === 0
                ? toDecimals(_reserve0, t.decimals)
                : toDecimals(_reserve1, t.decimals);
            t.price = Number(prices[t.address]);
            t.balance = t.reserve * poolShare;
            t.value = t.balance * t.price;

            m.stats.tvl += t.value;

            return t;
          });
        } else {
          m.stakingToken.price = Number(prices[m.stakingToken.address]);
          m.stakingToken.value = m.stakingToken.balance * m.stakingToken.price;
          m.stats.tvl += m.stakingToken.value;
        }

        m.rewardToken.price = Number(prices[m.rewardToken.address]);

        const { allocPoint } = multicallRsp.get(this.poolInfoLabel(m)).output.data;

        const aprStats: APRStats = {
          totalAllocPoints: totalAllocPoint,
          poolAllocPoints: allocPoint,
          rewardTokenPerBlock: toDecimals(joePerBlock, m.rewardToken.decimals),
          rewardTokenPrice: m.rewardToken.price,
          blockTime: 2,
          farmingPoolTVL: m.stats.tvl,
        };
        m.stats.apr = this.calculateAPR(aprStats);

        //console.log(m)
        return m;
      }
    });

    return this.mapping;
  }

  private getCallsForPool(stakingPosition: IntegrationStakingPositionDto) {
    const calls: Map<string, CallData> = new Map<string, CallData>();

    // reserves of lp token
    if (stakingPosition.stakingToken.tokens.length === 2) {
      calls.set(this.getReservesLabel(stakingPosition), {
        address: stakingPosition.stakingToken.address,
        abi: Abis.getReserves,
        input: {
          data: [],
        },
        output: {},
      });

      // total supply supply of staking lp token
      calls.set(this.totalSupplyLabel(stakingPosition), {
        address: stakingPosition.stakingToken.address,
        abi: Abis.totalSupply,
        input: {
          data: [],
        },
        output: {},
      });
    }

    // balance of lp token on masterchief contract
    calls.set(this.balanceOfLabel(stakingPosition), {
      address: stakingPosition.stakingToken.address,
      abi: Abis.balanceOf,
      input: {
        data: [TraderjoeAddresses.chiefV2],
      },
      output: {},
    });

    // poolInfo to calculate APR
    calls.set(this.poolInfoLabel(stakingPosition), {
      address: TraderjoeAddresses.chiefV2,
      abi: Abis.poolInfoV2,
      input: {
        data: [stakingPosition.poolId],
      },
      output: {},
    });

    return calls;
  }

  private getCallsForChief() {
    return new Map<string, CallData>([
      [
        this.totalAllocPointLabel(),
        {
          address: TraderjoeAddresses.chiefV2,
          abi: Abis.totalAllocPoint,
          input: {
            data: [],
          },
          output: {},
        },
      ],
      [
        this.joePerBlockLabel(),
        {
          address: TraderjoeAddresses.chiefV2,
          abi: Abis.joePerSecV2,
          input: {
            data: [],
          },
          output: {},
        },
      ],
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
      addressesSet.add(m.rewardToken.address);
    });
    return addressesSet;
  }

  public calculateAPR({
    totalAllocPoints,
    poolAllocPoints,
    rewardTokenPerBlock,
    rewardTokenPrice,
    blockTime,
    farmingPoolTVL,
  }: APRStats): number {
    const poolRewardPerBlock = poolAllocPoints
      .div(totalAllocPoints)
      .times(rewardTokenPerBlock)
      .times(rewardTokenPrice); 
    //console.log(`${totalAllocPoints} + ${poolAllocPoints} + ${rewardTokenPerBlock} + ${blockTime} + ${farmingPoolTVL}`)
    const aprPerBlock = poolRewardPerBlock.div(farmingPoolTVL).toNumber() * 100;
    const blocksPerYear = (86400 * 365) / blockTime;
    return aprPerBlock * blocksPerYear;
  }

  private getReservesLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(Abis.getReserves.name, stakingPosition.stakingToken.address);
  }

  private totalSupplyLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(Abis.totalSupply.name, stakingPosition.stakingToken.address);
  }

  private balanceOfLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(
      Abis.balanceOf.name,
      TraderjoeAddresses.chiefV2,
      stakingPosition.stakingToken.address,
    );
  }

  private poolInfoLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(Abis.poolInfoV2.name, TraderjoeAddresses.chiefV2, stakingPosition.poolId);
  }

  private totalAllocPointLabel() {
    return concatStrings(Abis.totalAllocPoint.name, TraderjoeAddresses.chiefV2);
  }

  private joePerBlockLabel() {
    return concatStrings(Abis.joePerSecV2.name, TraderjoeAddresses.chiefV2);
  }

  private poolLengthLabel() {
    return concatStrings(Abis.poolLength.name, TraderjoeAddresses.chiefV2);
  }
}
