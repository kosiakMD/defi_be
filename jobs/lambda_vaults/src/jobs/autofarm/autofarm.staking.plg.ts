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
import { isTimeToDo } from '../../utils/time';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { APRStats } from '../dto/apr';
import { IntegrationDataConverter } from '../integration.data.converter';
import { JobInterface } from '../job.interface';
import { Abis } from './abis/abis';
import { CurveAbis } from './abis/curve.abis';
import { AutofarmAddressesPLG as AutofarmAddresses, curveLpToMinter } from './addresses';
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

  static curvePools: string[] = Array.from(curveLpToMinter.keys()); // a list of curve pools addresses

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
      this.logger.log('it is time to update mapping', this.placeholder);
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

    const poolsInfo: Map<string, any> = await this.getAllPoolInfo(AutofarmAddresses.chiefV2Polygon);

    const chiefContract = AutofarmAddresses.chiefV2Polygon;

    for (const uniquePoolId of poolsInfo.keys()) {
      const [address] = uniquePoolId.split('_');
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

        const stAddress = stakingToken.address.toLowerCase();

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
        } else if (AutofarmStakingPLG.curvePools.includes(stAddress)) {
          // TODO: shouldn't need this since curvePools should have
          // underlyingAssets returned from assetService
          const minter = curveLpToMinter.get(stAddress);
          const minterContract = new CurveAbis(minter);
          const calls = new Map<string, CallData>();

          const tokenCount = 3;

          for (let i = 0; i < tokenCount; i++) {
            calls.set(this.getCoinLabel(address, i), minterContract.coins(i));
          }

          const multicallRsp: Map<string, CallData> = await this.multicallService.handleInBatches(
            calls,
            this.chain,
          );

          const tokens = [];

          for (let i = 0; i < tokenCount; i++) {
            const tokenAddress = multicallRsp
              .get(this.getCoinLabel(address, i))
              .output.data.toString();

            const tokenData = await this.accountService.saveTrackingAsset(tokenAddress, this.chain);

            const token = plainToClass(IntegrationPoolTokenDto, {
              address: tokenAddress.toLowerCase(),
              name: tokenData.name,
              symbol: tokenData.symbol,
              decimals: tokenData.decimals,
              positionInPool: i,
            });

            tokens.push(token);
          }

          stakingToken.tokens.push(...tokens);
        }
        const stakingPoolFeature: IntegrationStakingPositionDto = plainToClass(
          IntegrationStakingPositionDto,
          {
            address: chiefContract,
            poolId: poolsInfo.get(uniquePoolId).id.toString(),
            poolName: null,
            rewards: [rewardTokenAUTO, rewardTokenMATIC],
            stakingToken: stakingToken,
          },
        );

        stakingFeatures.push(stakingPoolFeature);
      } catch (e) {
        this.logger.error(
          `error, chain [${this.chain}], address [${address}] - ${e.message}`,
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
      poolsInfoMap.set(`${poolInfo.output.data.want.toLowerCase()}_${i}`, {
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

  async updateWithChainData(): Promise<any[]> {
    const batchCalls = [];

    this.mapping.forEach((m) => {
      if (m instanceof IntegrationStakingPositionDto) {
        batchCalls.push(...this.getCallsForPool(m, AutofarmAddresses.chiefV2Polygon).entries());
      }
    });

    const batchCallsMap = new Map<string, CallData>(batchCalls);

    const pricedTokenAddresses: string = Array.from(this.getPricedTokensSet()).join(',');

    const [{ prices }, multicallRsp] = await Promise.all([
      this.priceService.getCurrentPrices(pricedTokenAddresses, CurrencyIdEnum.usd, ChainIdEnum.plg),
      this.multicallService.handleInBatches(batchCallsMap, ChainIdEnum.plg),
    ]);

    const vaultCalls = [];

    this.mapping.forEach((m) => {
      if (m instanceof IntegrationStakingPositionDto) {
        const { strat } = multicallRsp.get(this.poolInfoLabel(m, AutofarmAddresses.chiefV2Polygon))
          .output.data;

        vaultCalls.push(...this.getCallsForVault(strat, m.poolId).entries());
      }
    });

    const vaultCallsMap = new Map<string, CallData>(vaultCalls);

    const multicallVaults = await this.multicallService.handleInBatches(
      vaultCallsMap,
      ChainIdEnum.plg,
    );

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

          m = this.getDataFromMulticallRsp(
            multicallRsp,
            m,
            lockedTotal,
            prices,
            priceToken0[token0Address],
          );

          m.rewards[0].price = Number(prices[m.rewards[0].address]);
          m.rewards[1].price = Number(prices[m.rewards[1].address]);
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
    stakingPos.staked = toDecimals(lockedTotal, stakingPos.stakingToken.decimals).toString();
    stakingPos.stakingToken.balance = toDecimals(lockedTotal, stakingPos.stakingToken.decimals);

    const totalSupply: BigNumber = multicallRsp.get(this.totalSupplyLabel(stakingPos)).output.data;
    stakingPos.stakingToken.totalSupply = toDecimals(totalSupply, stakingPos.stakingToken.decimals);
    const poolShare = stakingPos.stakingToken.balance / stakingPos.stakingToken.totalSupply;

    if (AutofarmStakingPLG.curvePools.includes(stakingPos.stakingToken.address.toLowerCase())) {
      const tokenCount = stakingPos.stakingToken.tokens.length;
      const reserves = new Map<string, number>();

      for (let i = 0; i < tokenCount; i++) {
        const reserveRaw = multicallRsp
          .get(this.getCoinBalanceLabel(stakingPos.address, i))
          .output.data.toNumber();
        const coin = multicallRsp
          .get(this.getCoinLabel(stakingPos.address, i))
          .output.data.toLowerCase();
        reserves.set(coin, toDecimals(reserveRaw, stakingPos.stakingToken.tokens[i].decimals));
      }

      stakingPos.stakingToken.tokens.map((t) => {
        t.reserve = reserves.get(t.address.toLowerCase());
        t.price = Number(prices[t.address.toLowerCase()]);
        t.balance = t.reserve * poolShare;
        t.value = t.balance * t.price;

        stakingPos.stats.tvl += t.value;

        return t;
      });
    } else if (stakingPos.stakingToken.tokens.length === 2) {
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
    const stAddress = stakingPosition.stakingToken.address.toLowerCase();

    if (AutofarmStakingPLG.curvePools.includes(stAddress)) {
      const minter = curveLpToMinter.get(stAddress);
      const minterContract = new CurveAbis(minter);

      const tokenCount = stakingPosition.stakingToken.tokens.length;

      for (let i = 0; i < tokenCount; i++) {
        calls.set(this.getCoinBalanceLabel(stakingPosition.address, i), minterContract.balances(i));
        calls.set(this.getCoinLabel(stakingPosition.address, i), minterContract.coins(i));
      }
    } else if (stakingPosition.stakingToken.tokens.length === 2) {
      calls.set(this.getReservesLabel(stakingPosition), {
        address: stAddress,
        abi: Abis.getReserves,
        input: {
          data: [],
        },
        output: {},
      });
    }

    // total supply supply of staking lp token
    calls.set(this.totalSupplyLabel(stakingPosition), {
      address: stAddress,
      abi: Abis.totalSupply,
      input: {
        data: [],
      },
      output: {},
    });

    // balance of lp token on masterchief contract
    calls.set(this.balanceOfLabel(stakingPosition, chiefContract), {
      address: stAddress,
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
      m.rewards.forEach((r) => {
        addressesSet.add(r.address);
      });
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

  private getCoinLabel(contract: string, i: number) {
    return concatStrings('coin', contract, i);
  }

  private getCoinBalanceLabel(contract: string, i: number) {
    return concatStrings('coinBalance', contract, i);
  }
}
