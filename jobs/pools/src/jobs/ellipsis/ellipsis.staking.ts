import BigNumber from 'bignumber.js';
import { classToPlain, plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CallData } from '../../chain/dto/call.data';
import { CurvePoolInfoResponse } from '../../chain/dto/token';
import { MulticallService } from '../../chain/multicall.service';
import { Web3Provider } from '../../chain/web3.provider';
import { ChainIdEnum, CurrencyIdEnum } from '../../config/enum';
import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { DbPoolTokenDto, LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { TrackedVaultItem } from '../../store/tracked.vault.item.entity';
import { toDecimals } from '../../utils/number';
import { concatStrings } from '../../utils/string';
import { TrackedVaultItemsMap } from '../data/tracked.vault.items.map';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { ERC20Token } from '../dto/common';
import {
  APRStats,
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
  StakingFeatureMapping,
  UnderlyingStakingLp,
} from '../dto/staking.dto';
import { IntegrationDataConverter } from '../integration.data.converter';
import { JobInterface } from '../job.interface';
import { Abis } from './abis';
import { EllipsisAddresses } from './addresses';
import { ellipsisPoolsMap } from './util';

@Injectable()
export class EllipsisStaking implements JobInterface {
  chain = ChainIdEnum.bsc;
  feature = 'staking';
  protocol = 'Ellipsis';
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;

  private mapping = [];
  private availableDtosForConversion: Map<string, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly web3Provider: Web3Provider,
    private readonly accountService: AccountService,
    private readonly storeService: StoreService,
    private readonly multicallService: MulticallService,
    private readonly priceService: PriceService,
  ) {
    this.availableDtosForConversion = new Map<string, string>([
      [IntegrationStakingPositionDto.name, IntegrationStakingPositionDto.name],
      [IntegrationERC20TokenDto.name, ERC20Token.name],
      [UnderlyingStakingLp.name, UnderlyingStakingLp.name],
      [IntegrationClaimableTokenDto.name, ERC20Token.name],
      [IntegrationPoolTokenDto.name, ERC20Token.name],
      [UnderlyingStakingLp.name, UnderlyingStakingLp.name],
    ]);
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

    const [epsRewardDto, busdRewardDto] = await Promise.all([
      this.accountService.saveTrackingAsset(EllipsisAddresses.eps, this.chain),
      this.accountService.saveTrackingAsset(EllipsisAddresses.busd, this.chain),
    ]);

    const rewardEps = plainToClass(IntegrationClaimableTokenDto, {
      address: epsRewardDto.address,
      name: epsRewardDto.name,
      symbol: epsRewardDto.symbol,
      decimals: epsRewardDto.decimals,
    });

    const rewardBusd = plainToClass(IntegrationClaimableTokenDto, {
      address: busdRewardDto.address,
      name: busdRewardDto.name,
      symbol: busdRewardDto.symbol,
      decimals: busdRewardDto.decimals,
    });

    const poolsInfo: Map<string, CurvePoolInfoResponse> = await this.getAllPoolInfo(
      EllipsisAddresses.staker,
    );

    // use while one address for test
    for (const address of poolsInfo.keys()) {
      try {
        const poolTokenData: DbPoolTokenDto | LiquidityPoolTokenDto = ellipsisPoolsMap.get(address)
          .minter
          ? await this.accountService.saveLikeCurveTrackingAsset(address, this.chain)
          : await this.accountService.saveTrackingAsset(address, this.chain);

        const stakingToken: IntegrationERC20TokenDto = plainToClass(IntegrationERC20TokenDto, {
          address: poolTokenData.address,
          name: poolTokenData.name,
          symbol: poolTokenData.symbol,
          decimals: poolTokenData.decimals,
        });

        if (poolTokenData.underlyingAssets) {
          stakingToken.tokens = [];
          poolTokenData.underlyingAssets.forEach((pt) => {
            if (pt.underlyingAssets?.length) {
              const poolInfo = poolsInfo.get(pt.address);
              const lp = plainToClass(UnderlyingStakingLp, {
                address: pt.address,
                name: pt.name,
                symbol: pt.symbol,
                decimals: pt.decimals,
                positionInPool: pt.positionInPool,
                poolId: poolInfo.id,
              });
              stakingToken.tokens.push(
                ...pt.underlyingAssets.map((underlying) => {
                  return plainToClass(IntegrationPoolTokenDto, {
                    address: underlying.address,
                    name: underlying.name,
                    symbol: underlying.symbol,
                    decimals: underlying.decimals,
                    positionInPool: underlying.positionInPool,
                    lp: lp,
                  });
                }),
              );
            } else {
              stakingToken.tokens.push(
                plainToClass(IntegrationPoolTokenDto, {
                  address: pt.address,
                  name: pt.name,
                  symbol: pt.symbol,
                  decimals: pt.decimals,
                  positionInPool: pt.positionInPool,
                }),
              );
            }
          });
        }

        const stakingPoolFeature: IntegrationStakingPositionDto = plainToClass(
          IntegrationStakingPositionDto,
          {
            address: EllipsisAddresses.staker,
            poolId: poolsInfo.get(address).id.toString(),
            poolName: null,
            rewards: [rewardEps],
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

    stakingFeatures.push(EllipsisStaking.getEpsStakingFeature(rewardEps, rewardBusd));

    const mappings = [];
    for (let i = 0; i < stakingFeatures.length; i++) {
      mappings.push(await this.toDbMapping(stakingFeatures[i]));
    }

    jobMapping.mapping = mappings;

    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);
    return updatedMapping;
  }

  private static getEpsStakingFeature(
    epsReward: IntegrationClaimableTokenDto,
    busdReward: IntegrationClaimableTokenDto,
  ): IntegrationStakingPositionDto {
    const espData = ellipsisPoolsMap.get(EllipsisAddresses.eps);
    return plainToClass(IntegrationStakingPositionDto, {
      address: espData.minter,
      poolId: null,
      poolName: null,
      rewards: [epsReward, busdReward],
      stakingToken: plainToClass(IntegrationERC20TokenDto, {
        address: epsReward.address,
        name: epsReward.name,
        symbol: epsReward.symbol,
        decimals: epsReward.decimals,
      }),
    });
  }

  private async getAllPoolInfo(
    stakerContract: EllipsisAddresses,
  ): Promise<Map<string, CurvePoolInfoResponse>> {
    const poolsInfoMap: Map<string, CurvePoolInfoResponse> = new Map<
      string,
      CurvePoolInfoResponse
    >();

    const calls = new Map<string, CallData>();
    for (let i = 0; i < ellipsisPoolsMap.size - 1; i++) {
      const mappedDTO = plainToClass(IntegrationStakingPositionDto, {});
      mappedDTO.poolId = i;

      calls.set(EllipsisStaking.poolInfoLabel(mappedDTO.poolId), {
        address: stakerContract,
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
      poolsInfoMap.set(poolInfo.output.data.lpToken.toLowerCase(), {
        // covert to lower case once received!
        id: i,
        lpToken: poolInfo.output.data.lpToken.toLowerCase(),
        oracleIndex: poolInfo.output.data.oracleIndex,
        allocPoint: poolInfo.output.data.allocPoint,
        lastRewardTime: poolInfo.output.data.lastRewardTime,
        accRewardPerShare: poolInfo.output.data.accRewardPerShare,
      });
      i++;
    }

    return poolsInfoMap;
  }

  private async toDbMapping(stakingPosition: IntegrationStakingPositionDto) {
    const mappedDto = plainToClass(StakingFeatureMapping, {});
    mappedDto.rewards = [];

    /** reward token */
    // todo: this unique ids must be moved to other place
    await Promise.all(
      stakingPosition.rewards.map(async (reward) => {
        const rewardTokenUniqueId = concatStrings(this.chain, reward.address);
        const rewardTokenItem: TrackedVaultItem = await this.getDbItem(reward, rewardTokenUniqueId);
        mappedDto.rewards.push({ dbId: rewardTokenItem.id, dtoName: reward.constructor.name });
      }),
    );

    /** staking token */
    const stakingTokenUniqueId = concatStrings(this.chain, stakingPosition.stakingToken.address);
    const stakingToken: TrackedVaultItem = await this.getDbItem(
      stakingPosition.stakingToken,
      stakingTokenUniqueId,
    );
    mappedDto.stakingToken = {
      dbId: stakingToken.id,
      dtoName: stakingPosition.stakingToken.constructor.name,
    };

    /** staking lp assets underlying */
    if (stakingPosition.stakingToken.tokens?.length) {
      mappedDto.stakingToken.tokens = [];
      for (const t of stakingPosition.stakingToken.tokens) {
        const tokenId = concatStrings(this.chain, t.address);
        const tokenItem: TrackedVaultItem = await this.getDbItem(t, tokenId);
        const mappedToken = {
          dbId: tokenItem.id,
          dtoName: t.constructor.name,
          positionInPool: t.positionInPool,
        };
        if (t.lp) {
          const tokenId = concatStrings(this.chain, t.lp.address);
          const tokenItem: TrackedVaultItem = await this.getDbItem(t.lp, tokenId);
          mappedToken['lp'] = {
            dbId: tokenItem.id,
            dtoName: 'UnderlyingStakingLp',
            positionInPool: t.lp.positionInPool,
          };
        }
        mappedDto.stakingToken.tokens.push(mappedToken);
      }
    }

    /** position */
    const positionUniqueId = concatStrings(
      this.chain,
      stakingPosition.address,
      stakingPosition.poolId,
    );
    const position: TrackedVaultItem = await this.getDbItem(stakingPosition, positionUniqueId);
    mappedDto.dbId = position.id;
    mappedDto.dtoName = stakingPosition.constructor.name;

    return mappedDto;
  }

  async getDbItem(item, uniqueId: string): Promise<TrackedVaultItem> {
    const temp: TrackedVaultItem = TrackedVaultItemsMap.get(uniqueId) as TrackedVaultItem;
    if (temp) {
      return temp;
    }
    if (!temp) {
      return await this.saveItemToDb(item, uniqueId);
    }
  }

  async saveItemToDb(item, uniqueId: string): Promise<TrackedVaultItem> {
    let universalDto;

    const newIntegrationJobItem: TrackedVaultItem = plainToClass(TrackedVaultItem, {});
    const toUniversalDtoName = this.availableDtosForConversion.get(item.constructor.name);
    newIntegrationJobItem.type = toUniversalDtoName;

    if (toUniversalDtoName === ERC20Token.name) {
      universalDto = {
        address: item.address,
        name: item.name,
        symbol: item.symbol,
        decimals: item.decimals,
      };
      newIntegrationJobItem.name = universalDto.name;
      newIntegrationJobItem.idUnique = uniqueId;
    }

    if (toUniversalDtoName === UnderlyingStakingLp.name) {
      universalDto = {
        address: item.address,
        name: item.name,
        symbol: item.symbol,
        decimals: item.decimals,
        positionInPool: item.positionInPool,
        poolId: item.poolId,
      };
      newIntegrationJobItem.name = universalDto.name;
      newIntegrationJobItem.idUnique = uniqueId;
    }
    if (toUniversalDtoName === IntegrationStakingPositionDto.name) {
      universalDto = {
        address: item.address,
        poolId: item.poolId,
        poolName: item.poolName,
      };
      newIntegrationJobItem.name = universalDto.poolName
        ? universalDto.poolName
        : universalDto.poolId;
      newIntegrationJobItem.idUnique = uniqueId;
    }

    newIntegrationJobItem.data = classToPlain(universalDto);
    const savedItem: TrackedVaultItem = await this.storeService.saveItem(newIntegrationJobItem);
    // it is important to add item to database
    TrackedVaultItemsMap.add(savedItem);
    return savedItem;
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
          ...EllipsisStaking.getCallsForPool(m).entries(),
        ]);
      }
    });
    batchCallsMap = new Map<string, CallData>([
      ...batchCallsMap.entries(),
      ...EllipsisStaking.getCallsForChief().entries(),
    ]);

    const pricedTokenAddresses: string = Array.from(this.getPricedTokensSet()).join(',');

    const [{ prices }, multicallRsp] = await Promise.all([
      this.priceService.getCurrentPrices(pricedTokenAddresses, CurrencyIdEnum.usd, ChainIdEnum.bsc),
      this.multicallService.handleInBatches(batchCallsMap, ChainIdEnum.bsc),
    ]);

    const totalAllocPoint: BigNumber = multicallRsp.get(EllipsisStaking.totalAllocPointLabel())
      .output.data;
    const rewardsPerSecond: BigNumber = multicallRsp.get(EllipsisStaking.rewardsPerSecondLabel())
      .output.data;

    this.mapping = this.mapping.map((m) => {
      if (m instanceof IntegrationStakingPositionDto) {
        const balance: BigNumber = multicallRsp.get(
          EllipsisStaking.balanceOfLabel(m.stakingToken.address),
        ).output.data;
        m.staked = toDecimals(balance, m.stakingToken.decimals);
        m.stakingToken.balance = toDecimals(balance, m.stakingToken.decimals);
        const totalSupply: BigNumber = multicallRsp.get(
          EllipsisStaking.totalSupplyLabel(m.stakingToken.address),
        ).output.data;
        m.stakingToken.totalSupply = toDecimals(totalSupply, m.stakingToken.decimals);
        // m.p
        if (m.stakingToken.tokens.length) {
          const poolShare = m.stakingToken.balance / m.stakingToken.totalSupply;
          m.stakingToken.tokens.map((t) => {
            if (t.lp) {
              const lpTotalSupply = multicallRsp.get(EllipsisStaking.totalSupplyLabel(t.lp.address))
                .output.data;
              const lpTotalSupplyDec = toDecimals(lpTotalSupply, t.lp.decimals);
              const lpTokenReserve = multicallRsp
                .get(EllipsisStaking.getBalancesLabel(m.stakingToken.address, t.lp.positionInPool))
                .output.data?.toString();
              const lpTokenReserveDec = toDecimals(lpTokenReserve, t.lp.decimals);
              const tokenReserve = multicallRsp
                .get(EllipsisStaking.getBalancesLabel(t.lp.address, t.positionInPool))
                .output.data?.toString();
              t.reserve = EllipsisStaking.getUnderlyingTokensBalances(
                lpTokenReserveDec,
                lpTotalSupplyDec,
                toDecimals(tokenReserve, t.decimals),
              );
            } else {
              if (!ellipsisPoolsMap.get(m.stakingToken.address).minter) {
                const reserves = Object.values(
                  multicallRsp.get(EllipsisStaking.getReservesLabel(m.stakingToken.address)).output
                    .data,
                );
                t.reserve = toDecimals(reserves[t.positionInPool], t.decimals);
              } else {
                t.reserve = toDecimals(
                  multicallRsp.get(
                    EllipsisStaking.getBalancesLabel(m.stakingToken.address, t.positionInPool),
                  ).output.data,
                  t.decimals,
                );
              }
            }

            t.price = Number(prices[t.address]);
            t.balance = t.reserve * poolShare;
            t.value = t.balance * t.price;

            m.stats.tvl += t.value;

            return t;
          });

          m.rewards[0].price = Number(prices[m.rewards[0].address]);

          const { allocPoint } = multicallRsp.get(EllipsisStaking.poolInfoLabel(m.poolId)).output
            .data;
          const aprStats: APRStats = {
            totalAllocPoints: totalAllocPoint,
            poolAllocPoints: allocPoint,
            rewardTokenPerBlock: toDecimals(rewardsPerSecond, m.rewards[0].decimals) * 3,
            rewardTokenPrice: m.rewards[0].price,
            blockTime: 3,
            farmingPoolTVL: m.stats.tvl,
          };
          m.stats.apr.push(this.calculateAPR(aprStats));
        } else {
          m.stakingToken.price = Number(prices[m.stakingToken.address]);
          m.stakingToken.value = m.stakingToken.balance * m.stakingToken.price;
          m.stats.tvl += m.stakingToken.value;
          m.rewards.forEach((reward) => (reward.price = Number(prices[reward.address])));
        }

        return m;
      }
    });

    return this.mapping;
  }

  private static getCallsForPool(stakingPosition: IntegrationStakingPositionDto) {
    let calls: Map<string, CallData> = new Map<string, CallData>();
    if (stakingPosition.stakingToken.tokens.length) {
      calls = EllipsisStaking.getReservesCallDataMap(stakingPosition.stakingToken.address);

      const lpUnderlyingToken = stakingPosition.stakingToken.tokens.filter((token) => token?.lp);

      if (lpUnderlyingToken?.length) {
        calls = new Map<string, CallData>([
          ...calls.entries(),
          ...EllipsisStaking.getReservesCallDataMap(lpUnderlyingToken[0].lp.address).entries(),
        ]);
        calls.set(
          EllipsisStaking.totalSupplyLabel(lpUnderlyingToken[0].lp.address),
          EllipsisStaking.getTotalSupplyCallData(lpUnderlyingToken[0].lp.address),
        );
      }
      // total supply supply of staking lp token
      calls.set(
        EllipsisStaking.poolInfoLabel(stakingPosition.poolId),
        EllipsisStaking.getPoolInfoCallData(stakingPosition.poolId),
      );
    }

    calls.set(
      EllipsisStaking.totalSupplyLabel(stakingPosition.stakingToken.address),
      EllipsisStaking.getTotalSupplyCallData(stakingPosition.stakingToken.address),
    );

    calls.set(
      EllipsisStaking.balanceOfLabel(stakingPosition.stakingToken.address),
      EllipsisStaking.getBalanceOfLpCallData(stakingPosition.stakingToken.address),
    );

    return calls;
  }

  private static getBalanceOfLpCallData(lpAddress: string) {
    return {
      address: lpAddress,
      abi: Abis.balanceOf,
      input: {
        data: ellipsisPoolsMap.get(lpAddress).coins
          ? [EllipsisAddresses.staker]
          : [EllipsisAddresses.epsStaker],
      },
      output: {},
    };
  }

  private static getPoolInfoCallData(poolId: number) {
    return {
      address: EllipsisAddresses.staker,
      abi: Abis.poolInfo,
      input: {
        data: [poolId],
      },
      output: {},
    };
  }

  private static getReservesCallDataMap(lpAddress: string): Map<string, CallData> {
    const lpData = ellipsisPoolsMap.get(lpAddress);
    const calls: Map<string, CallData> = new Map<string, CallData>();
    if (!lpData.minter) {
      calls.set(EllipsisStaking.getReservesLabel(lpAddress), {
        address: lpAddress,
        abi: Abis.getReserves,
        input: {
          data: [],
        },
        output: {},
      });
      return calls;
    }
    for (let i = 0; i < lpData.coins; i++) {
      calls.set(EllipsisStaking.getBalancesLabel(lpAddress, i), {
        address: lpData.minter,
        abi: Abis.balances,
        input: {
          data: [i],
        },
        output: {},
      });
    }
    return calls;
  }

  private static getTotalSupplyCallData(lpTokenAddress: string) {
    return {
      address: lpTokenAddress,
      abi: Abis.totalSupply,
      input: {
        data: [],
      },
      output: {},
    };
  }

  private static getCallsForChief() {
    return new Map<string, CallData>([
      [
        EllipsisStaking.totalAllocPointLabel(),
        {
          address: EllipsisAddresses.staker,
          abi: Abis.totalAllocPoint,
          input: {
            data: [],
          },
          output: {},
        },
      ],
      [
        EllipsisStaking.rewardsPerSecondLabel(),
        {
          address: EllipsisAddresses.staker,
          abi: Abis.rewardsPerSecond,
          input: {
            data: [],
          },
          output: {},
        },
      ],
    ]);
  }

  private static getUnderlyingTokensBalances(
    lpTokenReserve: number,
    lpTokenTotalSupply: number,
    underlyingReserve: number,
  ) {
    return new BigNumber(lpTokenReserve) //
      .div(lpTokenTotalSupply)
      .times(underlyingReserve)
      .toNumber();
  }

  private static getBalancesLabel(stakingTokenAddress: string, position: number) {
    return concatStrings(Abis.balances.name, stakingTokenAddress, position);
  }

  private static getReservesLabel(stakingTokenAddress: string) {
    return concatStrings(Abis.getReserves.name, stakingTokenAddress);
  }

  private static totalSupplyLabel(stakingTokenAddress: string) {
    return concatStrings(Abis.totalSupply.name, stakingTokenAddress);
  }

  private static balanceOfLabel(stakingTokenAddress: string) {
    return concatStrings(Abis.balanceOf.name, EllipsisAddresses.staker, stakingTokenAddress);
  }

  private static poolInfoLabel(poolId: number) {
    return concatStrings(Abis.poolInfo.name, EllipsisAddresses.staker, poolId);
  }

  private static totalAllocPointLabel() {
    return concatStrings(Abis.totalAllocPoint.name, EllipsisAddresses.staker);
  }

  private static rewardsPerSecondLabel() {
    return concatStrings(Abis.rewardsPerSecond.name, EllipsisAddresses.staker);
  }

  private static poolLengthLabel() {
    return concatStrings(Abis.poolLength.name, EllipsisAddresses.staker);
  }

  private getPricedTokensSet(): Set<string> {
    const addressesSet: Set<string> = new Set<string>();
    this.mapping.forEach((m) => {
      if (m instanceof IntegrationStakingPositionDto) {
        if (m.stakingToken.tokens.length) {
          m.stakingToken.tokens.forEach((t) => {
            addressesSet.add(t.address);
          });
        }
      } else {
        addressesSet.add(m.stakingToken.address);
      }
      m.rewards.forEach((reward) => addressesSet.add(reward.address));
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
      .times(rewardTokenPrice)
      .toString(); // 180
    const aprPerBlock =
      new BigNumber(poolRewardPerBlock) //
        .div(farmingPoolTVL)
        .toNumber() * 100; //0.000005229834724386371
    const blocksPerYear = (86400 * 365) / blockTime; // 10512000
    const apr = new BigNumber(aprPerBlock) //
      .times(blocksPerYear)
      .toString();
    return Number(apr);
  }
}
