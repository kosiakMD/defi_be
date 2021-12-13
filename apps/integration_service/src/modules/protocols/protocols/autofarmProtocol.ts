import BigNumber from 'bignumber.js';
import { classToClass, plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainDto,
  ClaimableDto,
  FeatureEnum,
  IntegrationClaimableTokenDto,
  Logger,
  ProtocolTypeEnum,
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { AutofarmProtocolEnum, ChainAbbrEnum, ProjectEnum } from '@app/common/enum';
import { decimalsDivider } from '@app/common/utils';

import {
  IntegrationERC20TokenDto,
  IntegrationStakingPositionDto,
  LPToken,
  PoolTokenDto,
} from '../../../common/dto/integrations.dto';
import { CurrentPricesPayload } from '../../../common/dto/price.response.dto';
import { Asset, BaseData, ERC20Token } from '../../../common/interfaces/transactions.interfaces';

import { Web3Provider } from '../../chains/web3.provider';
import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { AutofarmSubgraph } from '../../subgraphs/subgraphs/autofarm.subgraph';
import AbstractProtocol from './abstractProtocol';
import { AutofarmApiService } from './autofarm/autofarm.api.service';
import { AutofarmApiPools, StakingInterface } from './autofarm/autofarm.interfaces';
import { AutofarmStaking } from './autofarm/autofarm.staking';
import { autofarmFactoriesMap, autofarmRewardToken } from './autofarm/contracts/autofarm.abi';
import DataProviderProtocol from './dataProviderProtocol';

@Injectable()
export class AutofarmProtocol extends DataProviderProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.bsc, ChainAbbrEnum.plg];
  readonly project = ProjectEnum.autofarm;
  readonly name = AutofarmProtocolEnum.autofarm;
  readonly displayName = 'Autofarm';
  readonly features = {
    [ChainAbbrEnum.bsc]: [FeatureEnum.staking],
    [ChainAbbrEnum.plg]: [FeatureEnum.staking],
  };
  protected dataProvider;
  public feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    private readonly web3Provider: Web3Provider,
    private readonly subgraph: AutofarmSubgraph,
    private readonly autofarmApiService: AutofarmApiService,
    private readonly staking: AutofarmStaking,
  ) {
    super();

    this.dataProvider = this;
  }

  public async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    const chainFeatures = await Promise.allSettled(
      this.features[chain.abbr].map((f) => {
        return this.getFeatureData(addresses, chain, f);
      }),
    );

    const data = [];
    const errors = [];
    chainFeatures.forEach((r) => {
      if (r.status === 'fulfilled') {
        data.push(r.value);
      } else {
        this.logger.error(r.reason, r.reason.stack, AutofarmProtocol.name);
        errors.push(r.reason.toString());
      }
    });

    return [data.flat(), errors];
  }

  public async getFeatureData(
    addresses: Address[],
    chain: ChainDto,
    feature: FeatureEnum,
  ): Promise<BaseData[]> {
    switch (feature) {
      case FeatureEnum.staking:
        return this.staking.getData(addresses, chain);
      default:
        return [];
    }
  }

  private getResponse(
    stakingPositionsMap: Map<string, IntegrationStakingPositionDto[]>,
    chain: ChainDto,
  ): BaseData[] {
    const base: BaseData[] = [];
    stakingPositionsMap.forEach((value, key) => {
      let total = 0;
      value.forEach((staking) => {
        total += staking.rewardToken.claimableData.value;
        if (staking.stakingToken.tokens) {
          staking.stakingToken.tokens.forEach((token) => {
            total += token.value;
          });
        } else {
          total += staking.stakingToken.value;
        }
      });
      base.push(
        plainToClass(BaseDataStaking, {
          userAddress: key,
          chain,
          projectName: ProjectEnum.autofarm,
          protocolName: AutofarmProtocolEnum.autofarm,
          protocolType: ProtocolTypeEnum.staking,
          items: value,
          total,
          feature: FeatureEnum.staking,
        }),
      );
    });
    return base;
  }

  private getStakingPositionDtosMap(
    autofarmPools: AutofarmApiPools,
    stakingPositions: StakingInterface[],
    assets: Map<string, Asset>,
    prices: CurrentPricesPayload,
    claimAbleToken: IntegrationClaimableTokenDto,
    chain: ChainAbbrEnum,
  ): Map<string, IntegrationStakingPositionDto[]> {
    const responseMap = new Map<string, IntegrationStakingPositionDto[]>();
    stakingPositions.map((staking) => {
      const rewardToken: IntegrationClaimableTokenDto = classToClass(claimAbleToken);
      const claimable = new ClaimableDto();
      claimable.balance = new BigNumber(staking.claimable) //
        .div(decimalsDivider(18))
        .toString();
      claimable.value = new BigNumber(claimable.balance)
        .times(rewardToken.price) //
        .toNumber();
      rewardToken.claimableData = claimable;
      const response = new IntegrationStakingPositionDto();
      response.address = autofarmFactoriesMap.get(chain);
      response.poolId = String(staking.poolNum);
      response.staked = staking.amount;
      response.rewardToken = rewardToken;
      response.stakingToken = staking.isLp
        ? AutofarmProtocol.getStakingLpToken(staking, assets, prices)
        : AutofarmProtocol.getStakingErc20Token(staking, assets, prices, autofarmPools);
      const userStaking = responseMap.get(staking.userAddress);
      userStaking ? userStaking.push(response) : responseMap.set(staking.userAddress, [response]);
      return response;
    });

    return responseMap;
  }

  private static getStakingErc20Token(
    staking: StakingInterface,
    assets: Map<string, Asset>,
    prices: CurrentPricesPayload,
    autofarmPools: AutofarmApiPools,
  ): IntegrationERC20TokenDto {
    const asset = assets.get(staking.contractAddress);
    const erc20Token = new IntegrationERC20TokenDto();
    AutofarmProtocol.setFieldsFromAsset(asset, erc20Token);
    erc20Token.totalSupply = staking.totalSupply;
    const tokenPrice = prices[staking.contractAddress]
      ? prices[staking.contractAddress]
      : autofarmPools[staking.poolNum].wantPrice;
    erc20Token.price = Number(tokenPrice) || null;
    // TODO getTonesPrice via web3
    // tokenInfo.coefficient
    // ? new BigNumber(prices[tokenInfo.priceAsset]).times(tokenInfo.coefficient).toNumber()
    // : prices[tokenInfo.priceAsset];
    erc20Token.balance = new BigNumber(staking.amount)
      .div(decimalsDivider(erc20Token.decimals))
      .toString();
    erc20Token.value = new BigNumber(erc20Token.balance) //
      .times(erc20Token.price)
      .toNumber();
    return erc20Token;
  }

  private static getStakingLpToken(
    staking: StakingInterface,
    assets: Map<string, Asset>,
    prices: CurrentPricesPayload,
  ): LPToken {
    const token1 = assets.get(staking.token1);
    const token0 = assets.get(staking.token0);
    const lpAsset = assets.get(staking.contractAddress);
    const lpToken = new LPToken();
    AutofarmProtocol.setFieldsFromAsset(lpAsset, lpToken);
    lpToken.totalSupply = staking.totalSupply;
    lpToken.tokens = [
      AutofarmProtocol.getPairToken(staking, token1, prices, 1),
      AutofarmProtocol.getPairToken(staking, token0, prices, 0),
    ];

    return lpToken;
  }

  private static getClaimableToken(
    assets: Map<string, Asset>,
    price: CurrentPricesPayload,
  ): IntegrationClaimableTokenDto {
    const asset = assets.get(autofarmRewardToken);
    const claimableToken = new IntegrationClaimableTokenDto();
    claimableToken.price = Number(price[autofarmRewardToken]);
    AutofarmProtocol.setFieldsFromAsset(asset, claimableToken);

    return claimableToken;
  }

  private static getPairToken(
    staking: StakingInterface,
    asset: Asset,
    prices: CurrentPricesPayload,
    tokenPosition: number,
  ): PoolTokenDto {
    const poolToken = new PoolTokenDto();
    poolToken.reserve = tokenPosition === 1 ? staking.reserve1 : staking.reserve0;
    AutofarmProtocol.setFieldsFromAsset(asset, poolToken);
    poolToken.price = Number(prices[asset.address]);
    poolToken.balance = new BigNumber(staking.amount)
      .div(staking.totalSupply)
      .times(poolToken.reserve)
      .div(new BigNumber(10).pow(poolToken.decimals))
      .toString();
    poolToken.value = new BigNumber(poolToken.balance) //
      .times(poolToken.price)
      .toNumber();
    return poolToken;
  }

  private static setFieldsFromAsset(asset: Asset, token: ERC20Token): void {
    token.symbol = asset?.symbol;
    token.name = asset?.name;
    token.address = asset.address;
    token.decimals = asset.decimals;
  }
}

export default AutofarmProtocol;
