import BigNumber from 'bignumber.js';
import { classToClass, plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  AlpacaProtocolEnum,
  ChainAbbrEnum,
  ChainDto,
  ClaimableDto,
  FeatureEnum,
  LendingPositionDto,
  LeverageBorrowingTokenDto,
  LeverageErcToken,
  LeverageFarmingPosition,
  LeverageFarmingPositionDto,
  Logger,
  LPTokenDto,
  PoolTokenDto,
  ProjectEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { BaseDataLending } from '@app/common/dto/base.data.lending.dto';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { BaseLeverageFarming } from '@app/common/dto/base.leverage.farming.dto';
import { LendingTokenDto } from '@app/common/dto/lending.token.dto';
import {
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';
import { ERC20Token } from '@app/common/jobs/token';
import { concatStrings, decimalsDivider } from '@app/common/utils';

import { Asset, BaseData } from '../../../common/interfaces/transactions.interfaces';

import { Web3Provider } from '../../chains/web3.provider';
import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import AbstractProtocol from './abstractProtocol';
import { AlpacaApiService } from './alpaca/alpaca.api.service';
import { LocalMultiCall } from './alpaca/alpaca.local.multi.call';
import {
  alpacaDebtTokens,
  alpacaFactoriesMap,
  alpacaRewardToken,
} from './alpaca/contracts/alpaca.abi';
import {
  AlpacaStakingInterface,
  AlpacaTokenInfo,
  BorrowBalance,
  TokenContractData,
  TokensBalance,
  WorkerContractData,
} from './alpaca/interfaces/alpaca.interfaces';
import DataProviderProtocol from './dataProviderProtocol';

@Injectable()
export default class AlpacaProtocol extends DataProviderProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.bnb];
  readonly project = ProjectEnum.alpaca;
  readonly name = AlpacaProtocolEnum.alpaca;
  readonly displayName = 'Alpaca';
  readonly features = {
    [ChainAbbrEnum.bnb]: [FeatureEnum.staking, FeatureEnum.lending, FeatureEnum.leverageFarming],
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
  async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    const errors: string[] = [];
    const base: BaseData[] = [];
    try {
      const lowerCaseAddresses = addresses.map((address) => address.toLowerCase());

      const webProvider = this.web3Provider.getForChain(chain.abbr);
      const localMultiCall = new LocalMultiCall(webProvider, this.logger);
      const stakedPosition = await localMultiCall.getStakingPositions(
        chain.abbr,
        lowerCaseAddresses,
      );
      const tokensAddresses: Set<string> = new Set();
      await localMultiCall.setVaultPoolsTokens(stakedPosition, chain.abbr, tokensAddresses);

      const lendingTokens = await localMultiCall.getLendingPoolsBalances(
        lowerCaseAddresses,
        tokensAddresses,
      );

      const resp = await Promise.all(
        lowerCaseAddresses.map(
          async (address) => await this.alpacaApiService.getLeverageFarmingData(address),
        ),
      );

      const leverageFarming = resp.flat();
      tokensAddresses.add(alpacaRewardToken);

      const priceTokens = new Set<string>();
      const [, tokensContractData, workersContractData] = await Promise.all([
        localMultiCall.getVaultUsersInfo(stakedPosition, chain.abbr),
        localMultiCall.getTokensInfoMap(Array.from(tokensAddresses), priceTokens),
        localMultiCall.getWorkerContractsData(leverageFarming, priceTokens),
      ]);

      const [lpTokensBalances, borrowBalances, leverageTokensData] = await Promise.all([
        localMultiCall.getLpTokensBalances(workersContractData),
        localMultiCall.getBorrowBalances(workersContractData),
        localMultiCall.getLpTokenData(workersContractData, priceTokens),
      ]);

      const { data } = await this.accountService.getAssets(Array.from(priceTokens), [chain.id]);

      const assetsMap = new Map<string, Asset>();
      data.forEach((asset) => assetsMap.set(asset.address, asset));

      const claimableToken = AlpacaProtocol.getClaimableToken(assetsMap, tokensContractData);

      addresses.forEach((address) => {
        const addressWorkers = workersContractData.filter((data) => data.address === address);
        if (addressWorkers) {
          const leverage = plainToClass(BaseLeverageFarming, {
            chain,
            userAddress: address,
            protocolType: ProtocolTypeEnum.leverageFarming,
            projectName: ProjectEnum.alpaca,
            protocolName: this.name,
            total: null,
            feature: FeatureEnum.leverageFarming,
            items: this.getLeverageFarmingPositionsDtos(
              addressWorkers,
              assetsMap,
              lpTokensBalances,
              leverageTokensData,
              borrowBalances,
            ),
          });
          base.push(leverage);
        }

        const addressLending = lendingTokens.get(address);
        if (addressLending) {
          const lending = plainToClass(BaseDataLending, {
            chain,
            userAddress: address,
            protocolType: ProtocolTypeEnum.lending,
            projectName: ProjectEnum.alpaca,
            protocolName: this.name,
            total: null,
            feature: FeatureEnum.lending,
            items: this.getLendingPositionsDtos(
              tokensContractData,
              addressLending,
              assetsMap,
              address,
            ),
          });
          base.push(lending);
        }

        const addressStaking = stakedPosition?.filter((staking) => staking.userAddress === address);
        if (stakedPosition?.length) {
          const staking = plainToClass(BaseDataStaking, {
            chain,
            userAddress: address,
            protocolType: ProtocolTypeEnum.staking,
            projectName: ProjectEnum.alpaca,
            protocolName: this.name,
            total: null,
            feature: FeatureEnum.staking,
            items: this.getStakingPositionDtos(
              tokensContractData,
              addressStaking,
              assetsMap,
              claimableToken,
              chain.abbr,
            ),
          });
          base.push(staking);
        }
      });
    } catch (e) {
      errors.push(e.message);
    }
    return [base, errors];
  }

  private getLeverageFarmingPositionsDtos(
    leverageInterface: WorkerContractData[],
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
        const borrowToken = new LeverageBorrowingTokenDto();
        AlpacaProtocol.setFieldsFromAsset(asset, borrowToken);
        borrowToken.price = null;
        const borrowData = borrowBalances[concatStrings(position.poolToken, position.positionId)];
        borrowToken.balance = AlpacaProtocol.getDecimalsBalance(borrowData, borrowToken.decimals);
        borrowToken.value = null;
        leverageFarmingPosition.borrowToken = borrowToken;
        leverageFarmingPosition.farmToken = position.isLp
          ? this.getLpPoolToken(position, assets, lpTokensBalances, lpTokensData)
          : AlpacaProtocol.getSinglePoolToken(position, assets, lpTokensBalances, lpTokensData);
        return leverageFarmingPosition;
      });
  }

  private getLpPoolToken(
    position,
    assets,
    lpTokensBalances: TokensBalance,
    lpTokensData: TokenContractData,
  ): LPTokenDto {
    const farmingToken = new LPTokenDto();
    const lpAsset = assets.get(position.poolToken);
    AlpacaProtocol.setFieldsFromAsset(lpAsset, farmingToken);
    farmingToken.totalSupply = Number(
      lpTokensData[concatStrings(position.poolToken, position.positionId)].totalSupply,
    );
    farmingToken.tokens = this.getPairTokens(position, assets, lpTokensBalances, lpTokensData);
    return farmingToken;
  }

  private getPairTokens(
    leverageInterface: WorkerContractData,
    assets: Map<string, Asset>,
    lpTokensBalances: TokensBalance,
    lpTokensData: TokenContractData,
  ): PoolTokenDto[] {
    const field = concatStrings(leverageInterface.poolToken, leverageInterface.positionId);
    return [lpTokensData[field].token0, lpTokensData[field].token1].map((token) => {
      const pairToken = new PoolTokenDto();
      const asset = assets.get(token);
      AlpacaProtocol.setFieldsFromAsset(asset, pairToken);
      pairToken.price = null;
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
      pairToken.value = null;
      return pairToken;
    });
  }

  private getLendingPositionsDtos(
    stakedTokensInfoMap: Map<string, AlpacaTokenInfo>,
    lendingTokens: { [key: string]: string },
    assets: Map<string, Asset>,
    address: string,
  ): LendingPositionDto[] {
    const lendingPositions = [];
    for (const [key, value] of Object.entries(lendingTokens)) {
      const tokenInfo = stakedTokensInfoMap.get(key);
      const asset = assets.get(tokenInfo.priceAsset);
      const token = new LendingTokenDto();
      AlpacaProtocol.setFieldsFromAsset(asset, token);
      token.price = null;
      token.totalSupply = Number(tokenInfo.totalSupply);
      const balanceDecimals = new BigNumber(value) //
        .div(decimalsDivider(asset.decimals))
        .times(tokenInfo.coefficient)
        .toNumber();
      lendingPositions.push({
        token: token,
        balance: balanceDecimals,
        value: null,
        address,
      });
    }

    return lendingPositions;
  }

  private getStakingPositionDtos(
    alpacaTokensMap: Map<string, AlpacaTokenInfo>,
    stakingPositions: AlpacaStakingInterface[],
    assets: Map<string, Asset>,
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
      claimable.value = null;
      rewardToken.claimableData = claimable;
      const response = new IntegrationStakingPositionDto();
      response.address = alpacaFactoriesMap.get(chain);
      response.poolId = staking.poolNum;
      response.staked = staking.amount;
      response.rewards = [rewardToken];
      response.stakingToken = AlpacaProtocol.getStakingErc20Token(staking, assets, alpacaTokensMap);
      return response;
    });

    return stakings.filter((staking) => staking.stakingToken);
  }

  private static getStakingErc20Token(
    staking: AlpacaStakingInterface,
    assets: Map<string, Asset>,
    stakedTokensMap: Map<string, AlpacaTokenInfo>,
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
    erc20Token.totalSupply = Number(stakedTokenInfo.totalSupply);
    erc20Token.price = null;
    erc20Token.balance = new BigNumber(staking.amount)
      .div(decimalsDivider(erc20Token.decimals))
      .times(debtToken ? 1 : stakedTokenInfo.coefficient)
      .toNumber();
    erc20Token.value = null;

    return erc20Token;
  }

  private static getSinglePoolToken(
    leverageInterface: WorkerContractData,
    assets: Map<string, Asset>,
    tokensBalances: TokensBalance,
    tokensData: TokenContractData,
  ): LeverageErcToken {
    const leverageErcToken = new LeverageErcToken();
    const asset = assets.get(leverageInterface.poolToken);
    AlpacaProtocol.setFieldsFromAsset(asset, leverageErcToken);
    leverageErcToken.price = null;
    const field = concatStrings(leverageInterface.poolToken, leverageInterface.positionId);
    leverageErcToken.totalSupply = Number(tokensData[field].totalSupply);
    leverageErcToken.balance = AlpacaProtocol.getDecimalsBalance(
      tokensBalances[field],
      leverageErcToken.decimals,
    );
    leverageErcToken.value = null;
    return leverageErcToken;
  }

  private static getClaimableToken(
    assets: Map<string, Asset>,
    stakedTokensMap: Map<string, { totalSupply; coefficient; priceAsset }>,
  ): IntegrationClaimableTokenDto {
    const asset = assets.get(alpacaRewardToken);
    const claimableToken = new IntegrationClaimableTokenDto();
    claimableToken.price = null;
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
