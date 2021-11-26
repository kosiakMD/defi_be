// eslint-disable-next-line max-classes-per-file
import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CurrencyIdEnum } from '@app/common';
import {
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';

import { CallData } from '../../chain/dto/call.data';
import { MulticallService } from '../../chain/multicall.service';
import { Web3Provider } from '../../chain/web3.provider';
import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { toDecimals } from '../../utils/number';
import { concatStrings } from '../../utils/string';
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

    const rewardTokenAVAX = plainToClass(IntegrationClaimableTokenDto, {
      address: TraderjoeAddresses.avax,
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
    });

    const poolsInfoV2: Map<string, any> = await this.getAllPoolInfo(TraderjoeAddresses.chiefV2);
    const poolsInfoV3: Map<string, any> = await this.getAllPoolInfo(TraderjoeAddresses.chiefV3);

    const poolsInfoArray = [
      { poolsInfo: poolsInfoV2, chiefContract: TraderjoeAddresses.chiefV2 },
      { poolsInfo: poolsInfoV3, chiefContract: TraderjoeAddresses.chiefV3 },
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
          let stakingPoolFeature: IntegrationStakingPositionDto;

          if (chiefContract === TraderjoeAddresses.chiefV2) {
            stakingPoolFeature = plainToClass(IntegrationStakingPositionDto, {
              address: chiefContract,
              poolId: poolsInfo.get(address).id.toString(),
              poolName: null,
              rewards: [rewardTokenJOE],
              stakingToken: stakingToken,
            });
          } else {
            stakingPoolFeature = plainToClass(IntegrationStakingPositionDto, {
              address: chiefContract,
              poolId: poolsInfo.get(address).id.toString(),
              poolName: null,
              rewards: [rewardTokenJOE, rewardTokenAVAX],
              stakingToken: stakingToken,
            });
          }

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
        abi: chiefContract === TraderjoeAddresses.chiefV2 ? Abis.poolInfoV2 : Abis.poolInfoV3,
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
        allocPoint: poolInfo.output.data.allocPoint,
        lastRewardTimestamp: poolInfo.output.data.lastRewardTimestamp,
        accJoePerShare: poolInfo.output.data.accJoePerShare,
      });

      i++;
    }

    return poolsInfoMap;
  }

  async updateWithChainData(): Promise<any[]> {
    let batchCallsMap: Map<string, CallData> = new Map<string, CallData>();
    const blackList = [
      '0x6bcddcfa89119b0f3ede7fa45c627dcb704ac9a8',
      '0x0208a6aa8ac236b5f5fd01d814b7eccf0d9aeb7e',
    ];

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

            if (
              rewarder !== TraderjoeAddresses.avax &&
              !blackList.includes(rewarder.toLowerCase())
            ) {
              const calls: Map<string, CallData> = new Map<string, CallData>();
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

              const res = await this.multicallService.handleInBatches(calls, ChainIdEnum.avax);

              const aprStatsBonus = {
                rewardTokenPerBlock:
                  toDecimals(
                    res.get(concatStrings(Abis.tokenPerSec.name, rewarder)).output.data,
                    18,
                  ) * blockTime,
                rewardTokenPrice: Number(
                  prices[
                    res
                      .get(concatStrings(Abis.rewardToken.name, rewarder))
                      .output.data.toLowerCase()
                  ],
                ),
                blockTime: blockTime,
                farmingPoolTVL: m.stats.tvl,
              };

              m.rewards[0].apr = calculateAPR(aprStats);
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
    stakingPos.staked = toDecimals(balance, stakingPos.stakingToken.decimals);
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
    return concatStrings(
      chiefContract === TraderjoeAddresses.chiefV2 ? Abis.poolInfoV2.name : Abis.poolInfoV3.name,
      TraderjoeAddresses.chiefV3,
      stakingPosition.poolId,
    );
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
