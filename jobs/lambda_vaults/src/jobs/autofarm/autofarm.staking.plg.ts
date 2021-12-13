// eslint-disable-next-line max-classes-per-file
import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CurrencyIdEnum, FeatureEnum, ProtocolNameEnum } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import {
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';
import { concatStrings } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { toDecimals } from '../../utils/number';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { APRStats } from '../dto/apr';
import { IntegrationDataConverter } from '../integration.data.converter';
import { JobInterface } from '../job.interface';
import { Abis } from './abis';
import { AutofarmAddressesPLG as AutofarmAddresses } from './addresses';
import { DbMapping } from './dbmapping';

@Injectable()
export class AutofarmStakingPLG implements JobInterface {
  chain = ChainIdEnum.plg;
  feature = FeatureEnum.staking;
  protocol = ProtocolNameEnum.autofarm;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;

  private mapping = [];
  private dbMapping;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly accountService: AccountService,
    private readonly storeService: StoreService,
    private readonly multicallService: MulticallAggregator,
    private readonly priceService: PriceService,
  ) {
    this.dbMapping = new DbMapping(storeService);
  }

  async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;

    if (!jobMapping.mapping) {
      jobMapping = await this.buildInitialMapping(jobMapping);
    }

    jobMapping.mapping.forEach((jm) => {
      this.mapping.push(IntegrationDataConverter.toDTO(jm));
    });
  }

  /** completed for masterchief contract */
  async buildInitialMapping(jobMapping: TrackedVault): Promise<TrackedVault> {
    this.logger.log('building initial mapping', this.placeholder);

    const stakingFeatures: IntegrationStakingPositionDto[] = [];

    const accountTokenAUTODto: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
      AutofarmAddresses.autoPLG,
      this.chain,
    );
    const accountTokenMATICDto: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
      AutofarmAddresses.maticPLG,
      this.chain,
    );
    const rewardTokenAUTO = plainToClass(IntegrationClaimableTokenDto, {
      address: accountTokenAUTODto.address,
      name: accountTokenAUTODto.name,
      symbol: accountTokenAUTODto.symbol,
      decimals: accountTokenAUTODto.decimals,
    });

    const rewardTokenMATIC = plainToClass(IntegrationClaimableTokenDto, {
      address: accountTokenMATICDto.address,
      name: accountTokenMATICDto.name,
      symbol: accountTokenMATICDto.symbol,
      decimals: accountTokenMATICDto.decimals,
    });

    const poolsInfoPolygon: Map<string, any> = await this.getAllPoolInfo(
      AutofarmAddresses.chiefV2Polygon,
    );

    const poolsInfoArray = [
      { poolsInfo: poolsInfoPolygon, chiefContract: AutofarmAddresses.chiefV2Polygon },
    ];

    for (const { poolsInfo, chiefContract } of poolsInfoArray) {
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
              address: chiefContract,
              poolId: poolsInfo.get(address).id.toString(),
              poolName: null,
              rewards: [rewardTokenAUTO, rewardTokenMATIC],
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

  private async getAllPoolInfo(chiefContract: AutofarmAddresses): Promise<Map<string, any>> {
    const call = new Map<string, CallData>();
    call.set(this.poolLengthLabel(chiefContract), {
      address: chiefContract,
      abi: Abis.poolLength,
      input: {
        data: [],
      },
      output: {},
    });

    const poolsInfo: Map<string, CallData> = await this.multicallService.handleInBatches(
      call,
      this.chain,
    );

    const poolLengthResult = parseInt(poolsInfo.values().next().value.output.plain, 16);

    const poolsInfoMap: Map<string, any> = new Map<string, any>();

    const calls = new Map<string, CallData>();
    for (let i = 0; i < poolLengthResult; i++) {
      const mappedDTO = plainToClass(IntegrationStakingPositionDto, {});
      mappedDTO.poolId = i;

      calls.set(this.poolInfoLabel(mappedDTO, chiefContract), {
        address: chiefContract,
        abi: Abis.poolInfo,
        input: {
          data: [i],
        },
        output: {},
      });
    }

    const poolInfos = await this.multicallService.handleInBatches(calls, this.chain);

    let i = 0;
    for (const poolInfo of poolInfos.values()) {
      poolsInfoMap.set(poolInfo.output.data.want.toLowerCase(), {
        // covert to lower case once received!
        id: i,
        want: poolInfo.output.data.want.toLowerCase(),
        allocPoint: poolInfo.output.data.allocPoint,
        lastRewardBlock: poolInfo.output.data.lastRewardBlock,
        accAUTOPerShare: poolInfo.output.data.accAUTOPerShare,
        strat: poolInfo.output.data.strat,
      });

      i++;
    }

    return poolsInfoMap;
  }

  async updateTracked(): Promise<void> {
    //console.log('update existed tracking pools, just compare max pool id');
  }

  async updateWithChainData(): Promise<any[]> {
    let batchCallsMap: Map<string, CallData> = new Map<string, CallData>();

    this.mapping.forEach((m) => {
      if (m instanceof IntegrationStakingPositionDto) {
        batchCallsMap = new Map<string, CallData>([
          ...batchCallsMap.entries(),
          ...this.getCallsForPool(m, AutofarmAddresses.chiefV2Polygon).entries(),
        ]);
      }
    });

    const pricedTokenAddresses: string = Array.from(this.getPricedTokensSet()).join(',');

    const [{ prices }, multicallRsp] = await Promise.all([
      this.priceService.getCurrentPrices(pricedTokenAddresses, CurrencyIdEnum.usd, ChainIdEnum.plg),
      this.multicallService.handleInBatches(batchCallsMap, ChainIdEnum.plg),
    ]);

    let calls = new Map<string, CallData>();

    this.mapping.forEach((m) => {
      if (m instanceof IntegrationStakingPositionDto) {
        const { strat } = multicallRsp.get(this.poolInfoLabel(m, AutofarmAddresses.chiefV2Polygon))
          .output.data;

        calls = new Map<string, CallData>([
          ...calls,
          ...this.getCallsForVault(strat, m.poolId).entries(),
        ]);
      }
    });

    const multicallVaults = await this.multicallService.handleInBatches(calls, ChainIdEnum.plg);

    this.mapping = await Promise.all(
      this.mapping.map(async (m) => {
        if (m instanceof IntegrationStakingPositionDto) {
          const lockedTotal: BigNumber = multicallVaults.get(this.wantLockedTotalLabel(m.poolId))
            .output.data;

          const token0Address = multicallVaults.get(this.tokenAddressLabel(m.poolId, 0)).output
            .data;

          const { prices: priceToken0 } = await this.priceService.getCurrentPrices(
            token0Address,
            CurrencyIdEnum.usd,
            ChainIdEnum.bsc,
          );

          m = this.getDataFromMulticallRsp(multicallRsp, m, lockedTotal, prices, priceToken0);

          m.rewards[0].price = Number(prices[m.rewards[0].address]);
          m.rewards[1].price = Number(prices[m.rewards[1].address]);

          m.stats.apr.push(null);

          m.stats.apy = null;
        }

        return m;
      }),
    );

    return this.mapping;
  }

  private getDataFromMulticallRsp(
    multicallRsp: Map<string, CallData>,
    stakingPos: IntegrationStakingPositionDto,
    lockedTotal: BigNumber,
    prices: any,
    priceToken0: number,
  ) {
    stakingPos.staked = toDecimals(lockedTotal, stakingPos.stakingToken.decimals);
    stakingPos.stakingToken.balance = toDecimals(lockedTotal, stakingPos.stakingToken.decimals);

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

      stakingPos.stakingToken.tokens.map((t) => {
        t.reserve =
          t.positionInPool === 0
            ? toDecimals(_reserve0, t.decimals)
            : toDecimals(_reserve1, t.decimals);
        t.price = Number(prices[t.address]);
        t.balance = t.reserve * poolShare;
        t.value = t.balance * t.price;

        stakingPos.stats.tvl += t.value;

        return t;
      });
    } else {
      stakingPos.stakingToken.price = Number(priceToken0);
      stakingPos.stakingToken.value =
        stakingPos.stakingToken.balance * stakingPos.stakingToken.price;
      stakingPos.stats.tvl += stakingPos.stakingToken.value;
    }
    return stakingPos;
  }

  private getCallsForPool(
    stakingPosition: IntegrationStakingPositionDto,
    chiefContract: AutofarmAddresses,
  ) {
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
    calls.set(this.balanceOfLabel(stakingPosition, chiefContract), {
      address: stakingPosition.stakingToken.address,
      abi: Abis.balanceOf,
      input: {
        data: [chiefContract],
      },
      output: {},
    });

    // poolInfo to calculate APR
    calls.set(this.poolInfoLabel(stakingPosition, chiefContract), {
      address: chiefContract,
      abi: Abis.poolInfo,
      input: {
        data: [stakingPosition.poolId],
      },
      output: {},
    });

    return calls;
  }

  private getCallsForVault(vault: string, pool) {
    return new Map<string, CallData>([
      [
        this.wantLockedTotalLabel(pool),
        {
          address: vault,
          abi: Abis.wantLockedTotal,
          input: {
            data: [],
          },
          output: {},
        },
      ],
      [
        this.tokenAddressLabel(pool, 0),
        {
          address: vault,
          abi: Abis.token0Address,
          input: {
            data: [],
          },
          output: {},
        },
      ],
      [
        this.tokenAddressLabel(pool, 1),
        {
          address: vault,
          abi: Abis.token1Address,
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
      addressesSet.add(m.rewards[0].address);
      addressesSet.add(m.rewards[1].address);
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

  private balanceOfLabel(
    stakingPosition: IntegrationStakingPositionDto,
    chiefContract: AutofarmAddresses,
  ) {
    return concatStrings(Abis.balanceOf.name, chiefContract, stakingPosition.stakingToken.address);
  }

  private poolInfoLabel(
    stakingPosition: IntegrationStakingPositionDto,
    chiefContract: AutofarmAddresses,
  ) {
    return concatStrings(Abis.poolInfo.name, chiefContract, stakingPosition.poolId);
  }

  private poolLengthLabel(chiefContract: AutofarmAddresses) {
    return concatStrings(Abis.poolLength.name, chiefContract);
  }

  private wantLockedTotalLabel(pool) {
    return concatStrings(Abis.wantLockedTotal.name, pool);
  }

  private tokenAddressLabel(pool, tokenPosition) {
    return concatStrings('tokenAddress', pool, tokenPosition);
  }
}
