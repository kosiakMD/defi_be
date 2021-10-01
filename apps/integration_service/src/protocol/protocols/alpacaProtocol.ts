import BigNumber from 'bignumber.js';
import { classToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  AlpacaProtocolEnum,
  ChainAbbrEnum,
  ChainIdEnum,
  CurrentPricesPayload,
  FeatureEnum,
  LendingPositionDto,
  PoolTokenDto,
  ProjectEnum,
  ProtocolTypeEnum,
  Logger,
} from '@app/common';

import { AccountService } from '../../account/account.service';
import { Web3Provider } from '../../chain/web3.provider';
import {
  ClaimableDto,
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationStakingPositionDto,
  LeverageFarmingPositionDto,
  LPToken,
} from '../../integrations/integrations.dto';
import { Lending } from '../../interfaces/lending.position.interfaces';
import {
  LeverageFarming,
  LeverageFarmingPosition,
} from '../../interfaces/leverage.farming.interfaces';
import { Staking } from '../../interfaces/staking.position.interfaces';
import {
  Asset,
  BaseData,
  BorrowToken,
  ERC20Token,
  LendingErcToken,
  LeverageErcToken,
} from '../../interfaces/transactions.interfaces';
import { PriceService } from '../../price/price.service';
import { decimalsDivider } from '../../utils/util';
import AbstractProtocol from './abstractProtocol';
import {
  AlpacaStakingInterface,
  AlpacaTokenInfo,
  AlpacaUser,
  LeverageFarmingInterface,
} from './alpaca/alpaca.interfaces';
import { LocalMultiCall } from './alpaca/multicall/local.multi.call';
import { alpacaFactoriesMap, alpacaLegacyToken, alpacaRewardToken } from './alpaca/multicall/util';
import { AlpacaApiService } from './alpaca/services/alpaca.api.service';
import { AlpacaSubgraph } from './alpaca/services/alpaca.subgraph';
import DataProviderProtocol from './dataProviderProtocol';

@Injectable()
export class AlpacaProtocol extends DataProviderProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.bsc];
  readonly project = ProjectEnum.alpaca;
  readonly name = AlpacaProtocolEnum.alpaca;
  readonly displayName = 'Alpaca';
  readonly features = {
    [ChainAbbrEnum.bsc]: [FeatureEnum.staking, FeatureEnum.lending, FeatureEnum.leverageFarming],
  };
  protected dataProvider;
  public feeRate = 0.003;

  constructor(
    protected readonly alpacaSubgraph: AlpacaSubgraph,
    protected readonly web3Provider: Web3Provider,
    protected readonly priceService: PriceService,
    protected readonly accountService: AccountService,
    protected readonly alpacaApiService: AlpacaApiService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
  ) {
    super();

    this.dataProvider = this;
  }

  // override
  async getData(address: Address, chainId: ChainIdEnum): Promise<BaseData[]> {
    try {
      const alpacaUsers: AlpacaUser[] = await this.alpacaSubgraph.getSubgraphData([address]);
      const stakedPosition: AlpacaStakingInterface[] = [];
      this.getStakingPosition(alpacaUsers, stakedPosition);

      const webProvider = this.web3Provider.web3Map.get(chainId);
      const localMultiCall = new LocalMultiCall(webProvider, this.logger);
      const setTokenAddresses = await localMultiCall.getVaultPoolsInfo(stakedPosition, chainId);

      const [lendingTokens, leverageFarming] = await Promise.all([
        localMultiCall.getLendingPoolsBalances(address, setTokenAddresses),
        this.alpacaApiService.getLeverageFarmingData(address),
      ]);

      setTokenAddresses.add(alpacaRewardToken);

      const priceTokensAddresses = [];
      const [, stakedTokenInfoMap, leverageFarmingPositions] = await Promise.all([
        localMultiCall.getVaultUsersInfo(stakedPosition, chainId),
        localMultiCall.getTokensInfoMap(Array.from(setTokenAddresses), priceTokensAddresses),
        localMultiCall.getWorkerTokensData(leverageFarming, priceTokensAddresses),
      ]);

      await Promise.all([
        localMultiCall.getLpTokenBalanceAndBorrow(leverageFarmingPositions),
        localMultiCall.getLpTokenData(leverageFarmingPositions),
      ]);

      const [{ data }, price] = await Promise.all([
        this.accountService.getAssets(priceTokensAddresses, [chainId]),
        this.priceService.getTokenPricesFetch(priceTokensAddresses, chainId),
      ]);

      const assetsMap = new Map<string, Asset>();
      data.forEach((asset) => assetsMap.set(asset.address, asset));

      const claimableToken = AlpacaProtocol.getClaimableToken(
        assetsMap,
        price.prices,
        stakedTokenInfoMap,
      );

      const base: BaseData[] = [];

      if (leverageFarming?.length) {
        const leverage: LeverageFarming = AlpacaProtocol.getBaseDataInstance(
          ProtocolTypeEnum.leverageFarming,
          chainId,
          address,
        ) as LeverageFarming;

        leverage.leverageFarmingPositions = this.getLeverageFarmingPositionsDtos(
          leverageFarmingPositions,
          price.prices,
          assetsMap,
        );

        base.push(leverage);
      }

      if (lendingTokens?.size) {
        const lending: Lending = AlpacaProtocol.getBaseDataInstance(
          ProtocolTypeEnum.lending,
          chainId,
          address,
        ) as Lending;
        lending.lendingPositions = this.getLendingPositionsDtos(
          stakedTokenInfoMap,
          lendingTokens,
          price.prices,
          assetsMap,
          address,
        );

        base.push(lending);
      }

      if (stakedPosition?.length) {
        const staking: Staking = AlpacaProtocol.getBaseDataInstance(
          ProtocolTypeEnum.staking,
          chainId,
          address,
        ) as Staking;

        staking.stakingPositions = this.getStakingPositionDtos(
          stakedTokenInfoMap,
          stakedPosition,
          assetsMap,
          price.prices,
          claimableToken,
          chainId,
        );

        base.push(staking);
      }

      return base;
    } catch (e) {
      this.logger.error(e.message);
      throw e;
    }
  }

  private static getBaseDataInstance(
    protocolType: ProtocolTypeEnum,
    chainId: ChainIdEnum,
    userAddress: string,
  ): BaseData<ProtocolTypeEnum> {
    return {
      userAddress,
      chainId,
      projectName: ProjectEnum.alpaca,
      protocolName: AlpacaProtocolEnum.alpaca,
      protocolType: protocolType,
    };
  }

  private getLeverageFarmingPositionsDtos(
    leverageInterface: LeverageFarmingInterface[],
    prices: CurrentPricesPayload,
    assets: Map<string, Asset>,
  ): LeverageFarmingPosition[] {
    return leverageInterface
      .filter((position) => Number(position.baseTokenBalance) > 0)
      .map((position) => {
        const leverageFarmingPosition = new LeverageFarmingPositionDto();
        const asset = assets.get(position.baseToken);
        const borrowToken = new BorrowToken();
        AlpacaProtocol.setFieldsFromAsset(asset, borrowToken);
        borrowToken.price = prices[position.baseToken];
        borrowToken.balance = AlpacaProtocol.getDecimalsBalance(
          position.borrow,
          borrowToken.decimals,
        );
        borrowToken.value = new BigNumber(borrowToken.balance) //
          .times(borrowToken.price)
          .toNumber();
        leverageFarmingPosition.borrowToken = borrowToken;
        leverageFarmingPosition.farmToken = position.isLp
          ? this.getLpPoolToken(position, prices, assets)
          : AlpacaProtocol.getSinglePoolToken(position, prices, assets);

        AlpacaProtocol.getDebtRatioAndEarned(position, leverageFarmingPosition);
        return leverageFarmingPosition;
      });
  }

  private getLpPoolToken(position, prices, assets): LPToken {
    const farmingToken = new LPToken();
    const lpAsset = assets.get(position.poolToken);
    AlpacaProtocol.setFieldsFromAsset(lpAsset, farmingToken);
    farmingToken.totalSupply = position.totalSupply;
    farmingToken.tokens = this.getPairTokens(position, prices, assets);
    return farmingToken;
  }

  private getPairTokens(
    leverageInterface: LeverageFarmingInterface,
    prices: CurrentPricesPayload,
    assets: Map<string, Asset>,
  ): PoolTokenDto[] {
    return [leverageInterface.token0, leverageInterface.token1].map((token) => {
      const pairToken = new PoolTokenDto();
      const asset = assets.get(token);
      const borrowAsset = assets.get(leverageInterface.baseToken);
      AlpacaProtocol.setFieldsFromAsset(asset, pairToken);
      pairToken.price = prices[token];
      pairToken.reserve =
        token === leverageInterface.token0
          ? leverageInterface.reserve0
          : leverageInterface.reserve1;

      const pairValue = AlpacaProtocol.getPairTokenValue(
        leverageInterface.baseTokenBalance,
        borrowAsset.decimals,
        prices[borrowAsset.address],
      );
      pairToken.balance = new BigNumber(pairValue) //
        .div(2)
        .div(prices[asset.address])
        .toString();
      pairToken.value = Number(pairValue) / 2;
      return pairToken;
    });
  }

  private getLendingPositionsDtos(
    stakedTokensInfoMap: Map<string, AlpacaTokenInfo>,
    lendingTokens: Map<string, string>,
    prices: CurrentPricesPayload,
    assets: Map<string, Asset>,
    address: string,
  ): LendingPositionDto[] {
    const lendingPositions = [];
    lendingTokens.forEach((value, key) => {
      const tokenInfo = stakedTokensInfoMap.get(key);
      const asset = assets.get(tokenInfo.priceAsset);
      const token = new LendingErcToken();
      AlpacaProtocol.setFieldsFromAsset(asset, token);
      token.price = prices[tokenInfo.priceAsset];
      token.totalSupply = tokenInfo.totalSupply;
      const balanceDecimals = new BigNumber(value) //
        .div(decimalsDivider(asset.decimals))
        .times(tokenInfo.coefficient)
        .toString();
      lendingPositions.push({
        token: token,
        balance: balanceDecimals,
        value: new BigNumber(token.price) //
          .times(balanceDecimals)
          .toNumber(),
        address,
      });
    });

    return lendingPositions;
  }

  private getStakingPositionDtos(
    alpacaTokensMap: Map<string, AlpacaTokenInfo>,
    stakingPositions: AlpacaStakingInterface[],
    assets: Map<string, Asset>,
    prices: CurrentPricesPayload,
    claimAbleToken: IntegrationClaimableTokenDto,
    chain: ChainIdEnum,
  ): IntegrationStakingPositionDto[] {
    return stakingPositions.map((staking) => {
      const rewardToken: IntegrationClaimableTokenDto = classToClass(claimAbleToken);
      const claimable = new ClaimableDto();
      claimable.balance = AlpacaProtocol.getDecimalsBalance(
        staking.claimable,
        claimAbleToken.decimals,
      );
      claimable.value = new BigNumber(claimable.balance)
        .times(rewardToken.price) //
        .toString();
      rewardToken.claimableData = claimable;
      const response = new IntegrationStakingPositionDto();
      response.address = alpacaFactoriesMap.get(chain);
      response.poolId = String(staking.poolNum);
      response.staked = staking.amount;
      response.rewardToken = rewardToken;
      response.stakingToken = AlpacaProtocol.getStakingErc20Token(
        staking,
        assets,
        prices,
        alpacaTokensMap,
      );
      return response;
    });
  }

  private static getDebtRatioAndEarned(
    position: LeverageFarmingInterface,
    leverageFarmingPosition: LeverageFarmingPosition,
  ): void {
    let tokensValue;
    if (position.isLp) {
      const lp = leverageFarmingPosition.farmToken as LPToken;
      tokensValue = lp.tokens.reduce((total, current) => total + current.value, 0);
    } else {
      const erc20 = leverageFarmingPosition.farmToken as LeverageErcToken;
      tokensValue = erc20.value;
    }
    const borrow = leverageFarmingPosition.borrowToken.value;
    leverageFarmingPosition.debtRatio = (borrow / tokensValue) * 100;
    leverageFarmingPosition.earned = tokensValue - borrow;
  }

  private static getStakingErc20Token(
    staking: AlpacaStakingInterface,
    assets: Map<string, Asset>,
    prices: CurrentPricesPayload,
    stakedTokensMap: Map<string, AlpacaTokenInfo>,
  ): IntegrationERC20TokenDto {
    const stakedTokenInfo = stakedTokensMap.get(staking.stakeToken);
    const asset = assets.get(stakedTokenInfo.priceAsset);
    const erc20Token = new IntegrationERC20TokenDto();
    AlpacaProtocol.setFieldsFromAsset(asset, erc20Token);
    erc20Token.totalSupply = stakedTokenInfo.totalSupply;
    erc20Token.price =
      asset.address === alpacaLegacyToken
        ? prices[alpacaRewardToken]
        : prices[stakedTokenInfo.priceAsset];
    erc20Token.balance = new BigNumber(staking.amount)
      .div(decimalsDivider(erc20Token.decimals))
      .times(stakedTokenInfo.coefficient)
      .toString();
    erc20Token.value = new BigNumber(erc20Token.balance) //
      .times(erc20Token.price)
      .toNumber();
    return erc20Token;
  }

  private getStakingPosition(
    alpacaUsers: AlpacaUser[],
    stakedPosition: AlpacaStakingInterface[],
  ): void {
    alpacaUsers.forEach((user) =>
      user.balances.forEach((balance) => {
        if (Number(balance.balance) >= 0) {
          stakedPosition.push({
            poolNum: Number(balance.id.slice(balance.id.indexOf('-') + 1)),
            userAddress: user.id,
            amount: balance.balance,
          });
        }
      }),
    );
  }

  private static getSinglePoolToken(
    leverageInterface: LeverageFarmingInterface,
    prices: CurrentPricesPayload,
    assets: Map<string, Asset>,
  ): LeverageErcToken {
    const leverageErcToken = new LeverageErcToken();
    const asset = assets.get(leverageInterface.poolToken);
    const borrowAsset = assets.get(leverageInterface.baseToken);
    AlpacaProtocol.setFieldsFromAsset(asset, leverageErcToken);
    leverageErcToken.price = prices[asset.address];
    const pairValue = AlpacaProtocol.getPairTokenValue(
      leverageInterface.baseTokenBalance,
      borrowAsset.decimals,
      prices[borrowAsset.address],
    );
    leverageErcToken.balance = new BigNumber(pairValue) //
      .div(leverageErcToken.price)
      .toString();
    leverageErcToken.value = Number(pairValue);
    return leverageErcToken;
  }

  private static getClaimableToken(
    assets: Map<string, Asset>,
    price: CurrentPricesPayload,
    stakedTokensMap: Map<string, { totalSupply; coefficient; priceAsset }>,
  ): IntegrationClaimableTokenDto {
    const asset = assets.get(alpacaRewardToken);
    const claimableToken = new IntegrationClaimableTokenDto();
    claimableToken.price = price[alpacaRewardToken];
    claimableToken.totalSupply = stakedTokensMap.get(alpacaRewardToken).totalSupply;
    AlpacaProtocol.setFieldsFromAsset(asset, claimableToken);

    return claimableToken;
  }

  private static getPairTokenValue(balance: string, decimals: number, price: number): string {
    return new BigNumber(balance) //
      .div(decimalsDivider(decimals))
      .times(price)
      .toString();
  }

  private static getDecimalsBalance(balance: string, decimals: number): string {
    return new BigNumber(balance) //
      .div(decimalsDivider(decimals))
      .toString();
  }

  private static setFieldsFromAsset(asset: Asset, token: ERC20Token): void {
    token.symbol = asset?.symbol;
    token.name = asset?.name;
    token.address = asset.address;
    token.decimals = asset.decimals;
  }
}
