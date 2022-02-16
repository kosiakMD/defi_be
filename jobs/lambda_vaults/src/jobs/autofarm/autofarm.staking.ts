import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CurrencyIdEnum, FeatureEnum, ProtocolNameEnum, ChainIdEnum } from '@app/common';
import {
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';

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
import { fillUnderlyingTokens } from '../utils/token';
import { AutofarmApiService } from './autofarm.api.service';
import { AutofarmPool } from './autofarm.interfaces';
import { DbMapping } from './dbmapping';

@Injectable()
export class AutofarmStaking implements JobInterface {
  feature = FeatureEnum.staking;
  protocol = ProtocolNameEnum.autofarm;
  chain;
  placeholder;

  protected mapping = [];
  protected dbMapping;

  private readonly masterChiefAddresses = new Map([
    [ChainIdEnum.avax, '0x864a0b7f8466247a0e44558d29cdc37d4623f213'],
    [ChainIdEnum.bsc, '0x0895196562c7868c5be92459fae7f877ed450452'],
    [ChainIdEnum.cro, '0x76b8c3ecdf99483335239e66f34191f11534cbaa'],
    [ChainIdEnum.celo, '0xdd11b66b90402f294a017c4688509c364312303f'],
    [ChainIdEnum.ftm, '0x76b8c3ecdf99483335239e66f34191f11534cbaa'],
    [ChainIdEnum.harm, '0x9c57658139afb41949cebc07d806f37d29d13eea'],
    [ChainIdEnum.heco, '0x96a29c4bce3126266983f535b41c30dba80d5d99'],
    [ChainIdEnum.mriver, '0xfada8cc923514f1d7b0586ad554b4a0cead4680e'],
    [ChainIdEnum.okex, '0x864a0b7f8466247a0e44558d29cdc37d4623f213'],
    [ChainIdEnum.plg, '0x89d065572136814230a55ddeeddec9df34eb0b76'],
  ]);

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly storeService: StoreService,
    protected readonly priceService: PriceService,
    protected readonly autofarmApiService: AutofarmApiService,
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

    const poolsInfo: Map<string, any> = await this.getAllPoolsInfo();

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

        const rewardTokenData: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
          poolsInfo.get(address).rewardToken,
          this.chain,
        );

        const rewardToken: IntegrationERC20TokenDto = plainToClass(IntegrationERC20TokenDto, {
          address: rewardTokenData.address,
          name: rewardTokenData.name,
          symbol: rewardTokenData.symbol,
          decimals: rewardTokenData.decimals,
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
            address: this.masterChiefAddresses.get(this.chain),
            poolId: poolsInfo.get(address).id.toString(),
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

  private async getAllPoolsInfo(): Promise<Map<string, any>> {
    const autofarmPoolsData: AutofarmPool[] = Object.values(
      await this.autofarmApiService.getAutofarmPoolsData(this.chain),
    );

    const poolsInfoMap: Map<string, any> = new Map<string, any>();

    for (const poolData of autofarmPoolsData) {
      const wantAddress = poolData.wantAddress.toLowerCase();
      poolsInfoMap.set(wantAddress, {
        id: poolData.pid,
        want: wantAddress,
        allocPoint: poolData.poolInfo.allocPoint,
        rewardToken: poolData.earnedAddress,
        strat: poolData.poolInfo.strat,
      });
    }

    return poolsInfoMap;
  }

  async updateWithChainData(): Promise<IntegrationStakingPositionDto[]> {
    const autofarmPoolsData: AutofarmPool[] = Object.values(
      await this.autofarmApiService.getAutofarmPoolsData(this.chain),
    );

    const poolToInfoMap = new Map<IntegrationStakingPositionDto, AutofarmPool>(
      this.mapping.map((sp) => {
        const poolData = autofarmPoolsData.find(
          (pd) => sp.stakingToken.address === pd.wantAddress.toLowerCase(),
        );
        return [sp, poolData];
      }),
    );

    const pricedTokenAddresses: string = Array.from(this.getPricedTokensSet()).join(',');

    const { prices } = await this.priceService.getCurrentPrices(
      pricedTokenAddresses,
      CurrencyIdEnum.usd,
      this.chain,
    );

    this.mapping = await Promise.all(
      this.mapping.map(async (m) => {
        if (m instanceof IntegrationStakingPositionDto) {
          const poolData: AutofarmPool = poolToInfoMap.get(m);

          m = this.getDataFromMulticallRsp(poolData, m, prices);

          m.rewards[0].price = Number(prices[m.rewards[0].address]);

          m.stats.poolApy = Number(poolData.APY_total) * 100;
        }

        return m;
      }),
    );

    return this.mapping;
  }

  private getDataFromMulticallRsp(
    poolData: AutofarmPool,
    stakingPos: IntegrationStakingPositionDto,
    prices: any,
  ) {
    stakingPos.staked = toDecimals(
      poolData.wantLockedTotal,
      stakingPos.stakingToken.decimals,
    ).toString();
    stakingPos.stakingToken.balance = toDecimals(
      poolData.wantLockedTotal,
      stakingPos.stakingToken.decimals,
    );

    const totalSupply = poolData.farmWantLockedTotal?.hex
      ? parseInt(poolData.farmWantLockedTotal?.hex, 16)
      : Number(poolData.farmWantLockedTotal) === 0
      ? poolData.pairTotalSupply
      : poolData.farmWantLockedTotal;

    stakingPos.stakingToken.totalSupply = toDecimals(totalSupply, stakingPos.stakingToken.decimals);

    const poolShare = stakingPos.stakingToken.balance / stakingPos.stakingToken.totalSupply;

    if (stakingPos.stakingToken.tokens.length === 2) {
      const [_reserve0, _reserve1] = poolData.pairReserves ?? [0, 0];

      stakingPos.stats.tvl = fillUnderlyingTokens(
        stakingPos.stakingToken.tokens,
        [Number(_reserve0), Number(_reserve1)],
        prices,
        poolShare,
      );
    } else {
      stakingPos.stakingToken.price =
        Number(prices[stakingPos.stakingToken.address]) || Number(poolData?.wantPrice);
      stakingPos.stakingToken.value =
        stakingPos.stakingToken.balance * stakingPos.stakingToken.price;
      stakingPos.stats.tvl += stakingPos.stakingToken.value;
    }
    return stakingPos;
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
}
