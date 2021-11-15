import BigNumber from 'bignumber.js';
import { classToClass, plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  AlpacaProtocolEnum,
  ChainAbbrEnum,
  ChainDto,
  CurrentPricesPayload,
  FeatureEnum,
  LendingPositionDto,
  Logger,
  PoolTokenDto,
  ProjectEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { ClaimableDto, IntegrationClaimableTokenDto } from '@app/common';

import { AccountService } from '../../account/account.service';
import { Web3Provider } from '../../chain/web3.provider';
import {
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
import { concatStrings } from '../../utils/string';
import { decimalsDivider } from '../../utils/util';
import AbstractProtocol from './abstractProtocol';
import {
  AlpacaStakingInterface,
  AlpacaTokenInfo,
  WorkerContractData,
  TokenContractData,
  BorrowBalance,
  TokensBalance,
} from './alpaca/alpaca.interfaces';
import { LocalMultiCall } from './alpaca/multicall/local.multi.call';
import {
  alpacaDebtTokens,
  alpacaFactoriesMap,
  alpacaLegacyToken,
  alpacaRewardToken,
} from './alpaca/multicall/util';
import { AlpacaApiService } from './alpaca/services/alpaca.api.service';
import DataProviderProtocol from './dataProviderProtocol';

@Injectable()
export default class AlpacaProtocol extends DataProviderProtocol implements AbstractProtocol {
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
  async getDataByAddresses(address: Address, chain: ChainDto): Promise<BaseData[]> {
    const lowerCaseAddress = address.toLowerCase();

    const webProvider = this.web3Provider.getForChain(chain.abbr);
    const localMultiCall = new LocalMultiCall(webProvider, this.logger);
    const stakedPosition = await localMultiCall.getStakingPositions(chain.abbr, lowerCaseAddress);
    const setTokenAddresses = await localMultiCall.getVaultPoolsInfo(stakedPosition, chain.abbr);

    const [lendingTokens, leverageFarming] = await Promise.all([
      localMultiCall.getLendingPoolsBalances(lowerCaseAddress, setTokenAddresses),
      this.alpacaApiService.getLeverageFarmingData(lowerCaseAddress),
    ]);

    setTokenAddresses.add(alpacaRewardToken);

    const priceTokens = new Set<string>();
    const [, stakedTokenInfoMap, workerContractData] = await Promise.all([
      localMultiCall.getVaultUsersInfo(stakedPosition, chain.abbr),
      localMultiCall.getTokensInfoMap(Array.from(setTokenAddresses), priceTokens),
      localMultiCall.getWorkerContractsData(leverageFarming, priceTokens),
    ]);

    const [lpTokensBalances, borrowBalances, lpTokensData] = await Promise.all([
      localMultiCall.getLpTokensBalances(workerContractData),
      localMultiCall.getBorrowBalances(workerContractData),
      localMultiCall.getLpTokenData(workerContractData, priceTokens),
    ]);

    const priceTokensArray = Array.from(priceTokens);
    const [{ data }, price] = await Promise.all([
      this.accountService.getAssets(priceTokensArray, [chain.id]),
      this.priceService.getTokenPricesFetch(priceTokensArray, chain.id),
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
        chain,
        lowerCaseAddress,
      ) as LeverageFarming;

      leverage.leverageFarmingPositions = this.getLeverageFarmingPositionsDtos(
        workerContractData,
        price.prices,
        assetsMap,
        lpTokensBalances,
        lpTokensData,
        borrowBalances,
      );

      base.push(leverage);
    }

    if (lendingTokens?.size) {
      const lending: Lending = AlpacaProtocol.getBaseDataInstance(
        ProtocolTypeEnum.lending,
        chain,
        lowerCaseAddress,
      ) as Lending;
      lending.lendingPositions = this.getLendingPositionsDtos(
        stakedTokenInfoMap,
        lendingTokens,
        price.prices,
        assetsMap,
        lowerCaseAddress,
      );

      base.push(lending);
    }

    if (stakedPosition?.length) {
      const staking: Staking = AlpacaProtocol.getBaseDataInstance(
        ProtocolTypeEnum.staking,
        chain,
        lowerCaseAddress,
      ) as Staking;

      staking.stakingPositions = this.getStakingPositionDtos(
        stakedTokenInfoMap,
        stakedPosition,
        assetsMap,
        price.prices,
        claimableToken,
        chain.abbr,
      );

      base.push(staking);
    }

    return base;
  }

  private static getBaseDataInstance(
    protocolType: ProtocolTypeEnum,
    chain: ChainDto,
    userAddress: string,
  ): BaseData<ProtocolTypeEnum> {
    return plainToClass(BaseData, {
      userAddress,
      chain,
      projectName: ProjectEnum.alpaca,
      protocolName: AlpacaProtocolEnum.alpaca,
      protocolType: protocolType,
    });
  }

  private getLeverageFarmingPositionsDtos(
    leverageInterface: WorkerContractData[],
    prices: CurrentPricesPayload,
    assets: Map<string, Asset>,
    lpTokensBalances: TokensBalance,
    lpTokensData: TokenContractData,
    borrowBalances: BorrowBalance,
  ): LeverageFarmingPosition[] {
    return leverageInterface
      .filter(
        (position) =>
          Number(lpTokensBalances[concatStrings(position.poolToken, position.positionId)]) > 0,
      )
      .map((position) => {
        const leverageFarmingPosition = new LeverageFarmingPositionDto();
        const asset = assets.get(position.baseToken);
        const borrowToken = new BorrowToken();
        AlpacaProtocol.setFieldsFromAsset(asset, borrowToken);
        borrowToken.price = prices[position.baseToken];
        const borrowData = borrowBalances[concatStrings(position.poolToken, position.positionId)];
        borrowToken.balance = AlpacaProtocol.getDecimalsBalance(borrowData, borrowToken.decimals);
        borrowToken.value = new BigNumber(borrowToken.balance) //
          .times(borrowToken.price)
          .toNumber();
        leverageFarmingPosition.borrowToken = borrowToken;
        leverageFarmingPosition.farmToken = position.isLp
          ? this.getLpPoolToken(position, prices, assets, lpTokensBalances, lpTokensData)
          : AlpacaProtocol.getSinglePoolToken(
              position,
              prices,
              assets,
              lpTokensBalances,
              lpTokensData,
            );

        AlpacaProtocol.getDebtRatioAndEarned(position, leverageFarmingPosition);
        return leverageFarmingPosition;
      });
  }

  private getLpPoolToken(
    position,
    prices,
    assets,
    lpTokensBalances: TokensBalance,
    lpTokensData: TokenContractData,
  ): LPToken {
    const farmingToken = new LPToken();
    const lpAsset = assets.get(position.poolToken);
    AlpacaProtocol.setFieldsFromAsset(lpAsset, farmingToken);
    farmingToken.totalSupply =
      lpTokensData[concatStrings(position.poolToken, position.positionId)].totalSupply;
    farmingToken.tokens = this.getPairTokens(
      position,
      prices,
      assets,
      lpTokensBalances,
      lpTokensData,
    );
    return farmingToken;
  }

  private getPairTokens(
    leverageInterface: WorkerContractData,
    prices: CurrentPricesPayload,
    assets: Map<string, Asset>,
    lpTokensBalances: TokensBalance,
    lpTokensData: TokenContractData,
  ): PoolTokenDto[] {
    const field = concatStrings(leverageInterface.poolToken, leverageInterface.positionId);
    return [lpTokensData[field].token0, lpTokensData[field].token1].map((token) => {
      const pairToken = new PoolTokenDto();
      const asset = assets.get(token);
      AlpacaProtocol.setFieldsFromAsset(asset, pairToken);
      pairToken.price = prices[token];
      pairToken.reserve =
        token === lpTokensData[field].token0
          ? lpTokensData[field].reserve0
          : lpTokensData[field].reserve1;
      pairToken.balance = new BigNumber(
        AlpacaProtocol.getDecimalsBalance(lpTokensBalances[field], pairToken.decimals),
      )
        .div(AlpacaProtocol.getDecimalsBalance(lpTokensData[field].totalSupply, pairToken.decimals))
        .times(AlpacaProtocol.getDecimalsBalance(pairToken.reserve, pairToken.decimals))
        .toString();
      pairToken.value = new BigNumber(pairToken.balance) //
        .times(pairToken.price)
        .toNumber();
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
        .toNumber();
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
    chain: ChainAbbrEnum,
  ): IntegrationStakingPositionDto[] {
    const stakings = stakingPositions.map((staking) => {
      const rewardToken: IntegrationClaimableTokenDto = classToClass(claimAbleToken);
      const claimable = new ClaimableDto();
      claimable.balance = AlpacaProtocol.getDecimalsBalance(
        staking.claimable,
        claimAbleToken.decimals,
      );
      claimable.value = new BigNumber(claimable.balance)
        .times(rewardToken.price) //
        .toNumber();
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
        claimable.value,
      );
      return response;
    });

    return stakings.filter((staking) => staking.stakingToken);
  }

  private static getDebtRatioAndEarned(
    position: WorkerContractData,
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
    reward: number,
  ): IntegrationERC20TokenDto {
    const stakedTokenInfo = stakedTokensMap.get(staking.stakeToken);
    const asset = assets.get(stakedTokenInfo.priceAsset);
    if (!asset) {
      return;
    }
    /* If a staked token is a debtIbToken - value usd we show will be equal to the amount of
      the reward usd(like the deBank shows)
     */
    const debtToken = alpacaDebtTokens.some((address) => address === staking.stakeToken);
    const erc20Token = new IntegrationERC20TokenDto();
    AlpacaProtocol.setFieldsFromAsset(asset, erc20Token);
    erc20Token.totalSupply = stakedTokenInfo.totalSupply;
    erc20Token.price =
      asset.address === alpacaLegacyToken
        ? prices[alpacaRewardToken]
        : prices[stakedTokenInfo.priceAsset];
    erc20Token.balance = new BigNumber(staking.amount)
      .div(decimalsDivider(erc20Token.decimals))
      .times(debtToken ? 1 : stakedTokenInfo.coefficient)
      .toString();
    erc20Token.value = debtToken
      ? reward
      : new BigNumber(erc20Token.balance) //
          .times(erc20Token.price)
          .toNumber();
    return erc20Token;
  }

  private static getSinglePoolToken(
    leverageInterface: WorkerContractData,
    prices: CurrentPricesPayload,
    assets: Map<string, Asset>,
    tokensBalances: TokensBalance,
    tokensData: TokenContractData,
  ): LeverageErcToken {
    const leverageErcToken = new LeverageErcToken();
    const asset = assets.get(leverageInterface.poolToken);
    AlpacaProtocol.setFieldsFromAsset(asset, leverageErcToken);
    leverageErcToken.price = prices[asset.address];
    const field = concatStrings(leverageInterface.poolToken, leverageInterface.positionId);
    leverageErcToken.totalSupply = tokensData[field].totalSupply;
    leverageErcToken.balance = AlpacaProtocol.getDecimalsBalance(
      tokensBalances[field],
      leverageErcToken.decimals,
    );
    leverageErcToken.value = new BigNumber(leverageErcToken.balance)
      .times(leverageErcToken.price)
      .toNumber();
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
