// eslint-disable-next-line max-classes-per-file
import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, CurrencyIdEnum, FeatureEnum, ProtocolNameEnum } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
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
import { isTimeToDo } from '../../utils/time';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { IntegrationDataConverter } from '../integration.data.converter';
import { JobInterface } from '../job.interface';
import { calculateAPR, calculateAPRBonus } from '../utils/apr';
import { Abis } from './abis';
import { TraderjoeAddresses } from './addresses';
import { DbMapping } from './dbmapping';

@Injectable()
export class TraderJoeStaking implements JobInterface {
  chain = ChainIdEnum.avax;
  feature = FeatureEnum.staking;
  protocol = ProtocolNameEnum.traderjoe;
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

    if (
      !jobMapping.mapping ||
      isTimeToDo(jobMapping.updatedAt ?? jobMapping.createdAt, jobMapping.updateFrequency)
    ) {
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

    const accountTokenDto: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
      TraderjoeAddresses.joe,
      this.chain,
    );
    const rewardTokenJOE = plainToClass(IntegrationClaimableTokenDto, {
      address: accountTokenDto.address,
      name: accountTokenDto.name,
      symbol: accountTokenDto.symbol,
      decimals: accountTokenDto.decimals,
    });

    const poolsInfoV2: Map<string, any> = await this.getAllPoolInfo(TraderjoeAddresses.chiefV2);
    const poolsInfoV3: Map<string, any> = await this.getAllPoolInfo(TraderjoeAddresses.chiefV3);

    const poolsInfoArray = [
      { poolsInfo: poolsInfoV2, chiefContract: TraderjoeAddresses.chiefV2 },
      { poolsInfo: poolsInfoV3, chiefContract: TraderjoeAddresses.chiefV3 },
    ];

    for (const { poolsInfo, chiefContract } of poolsInfoArray) {
      for (const [address, poolInfo] of poolsInfo.entries()) {
        try {
          const poolTokenData: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
            address,
            this.chain,
          );

          const bonusToken = poolInfo.bonusToken
            ? await this.accountService.saveTrackingAsset(poolInfo.bonusToken, this.chain)
            : null;

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

          const rewards = [rewardTokenJOE];
          if (bonusToken) {
            rewards.push(
              plainToClass(IntegrationClaimableTokenDto, {
                address: bonusToken.address,
                name: bonusToken.name,
                symbol: bonusToken.symbol,
                decimals: bonusToken.decimals,
              }),
            );
          }

          const stakingPoolFeature = plainToClass(IntegrationStakingPositionDto, {
            address: chiefContract,
            poolId: poolsInfo.get(address).id.toString(),
            poolName: null,
            rewards,
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

  private async getAllPoolInfo(chiefContract: TraderjoeAddresses): Promise<Map<string, any>> {
    const poolLengthCall = new Map<string, CallData>();
    poolLengthCall.set(this.poolLengthLabel(chiefContract), {
      address: chiefContract,
      abi: Abis.poolLength,
      input: {
        data: [],
      },
      output: {},
    });

    const poolsLengthRaw: Map<string, CallData> = await this.multicallService.handleInBatches(
      poolLengthCall,
      this.chain,
    );

    const poolLength = parseInt(poolsLengthRaw.values().next().value.output.plain, 16);

    const poolsInfoMap: Map<string, any> = new Map<string, any>();

    const calls = new Map<string, CallData>();
    for (let poolId = 0; poolId < poolLength; poolId++) {
      const mappedDTO = plainToClass(IntegrationStakingPositionDto, {});
      mappedDTO.poolId = poolId;

      calls.set(this.poolInfoLabel(mappedDTO, chiefContract), {
        address: chiefContract,
        abi: chiefContract === TraderjoeAddresses.chiefV2 ? Abis.poolInfoV2 : Abis.poolInfoV3,
        input: {
          data: [poolId],
        },
        output: {},
      });
    }

    const poolInfos = await this.multicallService.handleInBatches(calls, this.chain);

    const bonusRewards = await this.getBonusRewards(chiefContract, poolInfos);

    let i = 0;
    for (const poolInfo of poolInfos.values()) {
      poolsInfoMap.set(poolInfo.output.data.lpToken.toLowerCase(), {
        // covert to lower case once received!
        id: i,
        lpToken: poolInfo.output.data.lpToken.toLowerCase(),
        allocPoint: poolInfo.output.data.allocPoint,
        lastRewardTimestamp: poolInfo.output.data.lastRewardTimestamp,
        accJoePerShare: poolInfo.output.data.accJoePerShare,
        bonusToken: bonusRewards.get(i),
      });

      i++;
    }

    return poolsInfoMap;
  }

  async getBonusRewards(
    chiefContract: Address,
    poolInfos: Map<string, CallData>,
  ): Promise<Map<number, Address>> {
    const bonusRewards = new Map();
    if (chiefContract === TraderjoeAddresses.chiefV2) {
      const v2Calls = new Map(
        Array.from(Array(poolInfos.size).keys()).map((poolId) => [
          poolId.toString(),
          {
            address: chiefContract,
            abi: Abis.rewarderBonusTokenInfo,
            input: {
              data: [poolId],
            },
            output: {},
          },
        ]),
      );
      const v2Results = await this.multicallService.handleInBatches(v2Calls, this.chain);
      v2Results.forEach((value, key) => {
        const bonus = value.output.data.bonusTokenAddress.toLowerCase();
        if (bonus !== ZERO_ADDRESS) {
          bonusRewards.set(Number(key), bonus);
        }
      });
    } else if (chiefContract === TraderjoeAddresses.chiefV3) {
      const v3Calls = new Map();
      poolInfos.forEach((value: any) => {
        if (value.output.data.rewarder !== ZERO_ADDRESS) {
          v3Calls.set(value.input.data[0].toString(), {
            address: value.output.data.rewarder,
            abi: Abis.rewarderRewardToken,
            input: {},
            output: {},
          });
        }
      });

      const v3Results = await this.multicallService.handleInBatches(v3Calls, this.chain);

      v3Results.forEach((value, key) => {
        const bonus = value.output.data.toLowerCase();
        if (bonus !== ZERO_ADDRESS) {
          bonusRewards.set(Number(key), bonus);
        }
      });
    }

    return bonusRewards;
  }

  async updateWithChainData(): Promise<any[]> {
    let batchCallsMap: Map<string, CallData> = new Map<string, CallData>();

    this.mapping.forEach((m) => {
      if (m instanceof IntegrationStakingPositionDto) {
        if (m.rewards.length === 2) {
          batchCallsMap = new Map<string, CallData>([
            ...batchCallsMap.entries(),
            ...this.getCallsForPool(m, TraderjoeAddresses.chiefV3).entries(),
          ]);
        } else {
          batchCallsMap = new Map<string, CallData>([
            ...batchCallsMap.entries(),
            ...this.getCallsForPool(m, TraderjoeAddresses.chiefV2).entries(),
          ]);
        }
      }
    });
    batchCallsMap = new Map<string, CallData>([
      ...batchCallsMap.entries(),
      ...this.getCallsForChief(TraderjoeAddresses.chiefV2).entries(),
      ...this.getCallsForChief(TraderjoeAddresses.chiefV3).entries(),
    ]);

    const pricedTokenAddresses: string = Array.from(this.getPricedTokensSet()).join(',');
    const [{ prices }, multicallRsp] = await Promise.all([
      this.priceService.getCurrentPrices(
        pricedTokenAddresses,
        CurrencyIdEnum.usd,
        ChainIdEnum.avax,
        this.protocol,
      ),
      this.multicallService.handleInBatches(batchCallsMap, ChainIdEnum.avax),
    ]);

    const totalAllocPointV2: BigNumber = multicallRsp.get(
      this.totalAllocPointLabel(TraderjoeAddresses.chiefV2),
    ).output.data;
    const joePerBlockV2: BigNumber = multicallRsp.get(
      this.joePerBlockLabel(TraderjoeAddresses.chiefV2),
    ).output.data;

    const totalAllocPointV3: BigNumber = multicallRsp.get(
      this.totalAllocPointLabel(TraderjoeAddresses.chiefV3),
    ).output.data;
    const joePerBlockV3: BigNumber = multicallRsp.get(
      this.joePerBlockLabel(TraderjoeAddresses.chiefV3),
    ).output.data;

    const blockTime = 2;

    this.mapping = await Promise.all(
      this.mapping.map(async (m) => {
        if (m instanceof IntegrationStakingPositionDto) {
          if (m.rewards.length === 2) {
            m = this.getDataFromMulticallRsp(multicallRsp, m, prices, TraderjoeAddresses.chiefV3);

            m.rewards[0].price = Number(prices[m.rewards[0].address]);
            m.rewards[1].price = Number(prices[m.rewards[1].address]);

            const { allocPoint } = multicallRsp.get(
              this.poolInfoLabel(m, TraderjoeAddresses.chiefV3),
            ).output.data;

            const aprStats = {
              totalAllocPoints: totalAllocPointV3,
              poolAllocPoints: allocPoint,
              rewardTokenPerBlock: toDecimals(joePerBlockV3, m.rewards[0].decimals) * blockTime,
              rewardTokenPrice: m.rewards[0].price,
              blockTime: blockTime,
              farmingPoolTVL: m.stats.tvl,
            };

            const { rewarder } = multicallRsp.get(this.poolInfoLabel(m, TraderjoeAddresses.chiefV3))
              .output.data;

            m.rewards[0].apr = calculateAPR(aprStats);

            if (rewarder !== TraderjoeAddresses.zeroAddress) {
              const calls: Map<string, CallData> = new Map<string, CallData>();
              calls.set(concatStrings(Abis.balance.name, rewarder), {
                address: rewarder,
                abi: Abis.balance,
                input: {
                  data: [],
                },
                output: {},
              });
              calls.set(concatStrings(Abis.rewardToken.name, rewarder), {
                address: rewarder,
                abi: Abis.rewardToken,
                input: {
                  data: [],
                },
                output: {},
              });
              calls.set(concatStrings(Abis.tokenPerSec.name, rewarder), {
                address: rewarder,
                abi: Abis.tokenPerSec,
                input: {
                  data: [],
                },
                output: {},
              });

              let rewardInfo;

              try {
                rewardInfo = await this.multicallService.handleInBatches(calls, ChainIdEnum.avax);
              } catch (e) {
                return m;
              }

              // reward token balance in contract
              const balance = toDecimals(
                rewardInfo.get(concatStrings(Abis.balance.name, rewarder)).output.data,
                18,
              );
              const tokenPerSecond = toDecimals(
                rewardInfo.get(concatStrings(Abis.tokenPerSec.name, rewarder)).output.data,
                18,
              );

              const aprStatsBonus = {
                rewardTokenPerBlock: balance ? tokenPerSecond * blockTime : 0,
                rewardTokenPrice: Number(
                  prices[
                    rewardInfo
                      .get(concatStrings(Abis.rewardToken.name, rewarder))
                      .output.data.toLowerCase()
                  ],
                ),
                blockTime: blockTime,
                farmingPoolTVL: m.stats.tvl,
              };

              m.rewards[1].apr = calculateAPRBonus(aprStatsBonus);
            } else {
              m.rewards[0].apr = calculateAPR(aprStats);
            }
          } else {
            m = this.getDataFromMulticallRsp(multicallRsp, m, prices, TraderjoeAddresses.chiefV2);

            m.rewards[0].price = Number(prices[m.rewards[0].address]);

            const { allocPoint } = multicallRsp.get(
              this.poolInfoLabel(m, TraderjoeAddresses.chiefV2),
            ).output.data;

            const aprStats = {
              totalAllocPoints: totalAllocPointV2,
              poolAllocPoints: allocPoint,
              rewardTokenPerBlock: toDecimals(joePerBlockV2, m.rewards[0].decimals),
              rewardTokenPrice: m.rewards[0].price,
              blockTime: blockTime,
              farmingPoolTVL: m.stats.tvl,
            };

            if (m.stakingToken.name === 'JoeBar') {
              m.stats.tvl = m.stakingToken.balance * m.rewards[0].price;
              aprStats.farmingPoolTVL = m.stats.tvl;
            }

            m.rewards[0].apr = calculateAPR(aprStats);
          }

          return m;
        }
      }),
    );

    return this.mapping;
  }

  private getDataFromMulticallRsp(
    multicallRsp,
    stakingPos: IntegrationStakingPositionDto,
    prices,
    chiefContract: TraderjoeAddresses,
  ) {
    const balance: BigNumber = multicallRsp.get(this.balanceOfLabel(stakingPos, chiefContract))
      .output.data;
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
      stakingPos.stakingToken.price = Number(prices[stakingPos.stakingToken.address]);
      stakingPos.stakingToken.value =
        stakingPos.stakingToken.balance * stakingPos.stakingToken.price;
      stakingPos.stats.tvl += stakingPos.stakingToken.value;
    }
    return stakingPos;
  }

  private getCallsForPool(
    stakingPosition: IntegrationStakingPositionDto,
    chiefContract: TraderjoeAddresses,
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
      abi: chiefContract === TraderjoeAddresses.chiefV2 ? Abis.poolInfoV2 : Abis.poolInfoV3,
      input: {
        data: [stakingPosition.poolId],
      },
      output: {},
    });

    return calls;
  }

  private getCallsForChief(chiefContract: TraderjoeAddresses) {
    return new Map<string, CallData>([
      [
        this.totalAllocPointLabel(chiefContract),
        {
          address: chiefContract,
          abi: Abis.totalAllocPoint,
          input: {
            data: [],
          },
          output: {},
        },
      ],
      [
        this.joePerBlockLabel(chiefContract),
        {
          address: chiefContract,
          abi: chiefContract === TraderjoeAddresses.chiefV2 ? Abis.joePerSecV2 : Abis.joePerSecV3,
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

      if (m.rewards.length === 2) addressesSet.add(m.rewards[1].address);
    });
    return addressesSet;
  }

  private getReservesLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(Abis.getReserves.name, stakingPosition.stakingToken.address);
  }

  private totalSupplyLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(Abis.totalSupply.name, stakingPosition.stakingToken.address);
  }

  private balanceOfLabel(
    stakingPosition: IntegrationStakingPositionDto,
    chiefContract: TraderjoeAddresses,
  ) {
    return concatStrings(Abis.balanceOf.name, chiefContract, stakingPosition.stakingToken.address);
  }

  private poolInfoLabel(
    stakingPosition: IntegrationStakingPositionDto,
    chiefContract: TraderjoeAddresses,
  ) {
    return concatStrings('poolInfo', chiefContract, stakingPosition.poolId);
  }

  private totalAllocPointLabel(chiefContract: TraderjoeAddresses) {
    return concatStrings(Abis.totalAllocPoint.name, chiefContract);
  }

  private joePerBlockLabel(chiefContract: TraderjoeAddresses) {
    return concatStrings(Abis.joePerSecV3.name, chiefContract);
  }

  private poolLengthLabel(chiefContract: TraderjoeAddresses) {
    return concatStrings(Abis.poolLength.name, chiefContract);
  }
}
