import BigNumber from 'bignumber.js';
import { classToClass } from 'class-transformer';
import { AbiItem } from 'web3-utils';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, Logger } from '@app/common';
import { FeatureEnum } from '@app/common';
import { ClaimableDto, IntegrationClaimableTokenDto } from '@app/common';
import { AutofarmProtocolEnum, ChainAbbrEnum, ProjectEnum } from '@app/common/enum';

import { AccountService } from '../../account/account.service';
import { Web3Provider } from '../../chain/web3.provider';
import { CurrentPricesPayload } from '../../dto/price.response.dto';
import {
  IntegrationERC20TokenDto,
  IntegrationStakingPositionDto,
  LPToken,
  PoolTokenDto,
  StakingPositionResponseDto,
} from '../../integrations/integrations.dto';
import { Asset, ERC20Token } from '../../interfaces/transactions.interfaces';
import { PriceService } from '../../price/price.service';
import { decimalsDivider } from '../../utils/util';
import AbstractProtocol from './abstractProtocol';
import { AutofarmApiPools, StakingInterface } from './autofarm/autofarm.interfaces';
import { LocalMultiCall } from './autofarm/multicall/local.multi.call';
import { autofarmFactoriesMap, autofarmRewardToken, lpTokenAbi } from './autofarm/multicall/util';
import { AutofarmApiService } from './autofarm/services/autofarm.api.service';
import { AutofarmSubgraph } from './autofarm/services/autofarm.subgraph';
import DataProviderProtocol from './dataProviderProtocol';

@Injectable()
export class AutofarmProtocol extends DataProviderProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.bsc];
  readonly project = ProjectEnum.autofarm;
  readonly name = AutofarmProtocolEnum.autofarm;
  readonly displayName = 'Autofarm';
  readonly features = { [ChainAbbrEnum.bsc]: [FeatureEnum.staking] };
  protected dataProvider;
  public feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    private readonly web3Provider: Web3Provider,
    private readonly subgraph: AutofarmSubgraph,
    private readonly autofarmApiService: AutofarmApiService,
  ) {
    super();

    this.dataProvider = this;
  }

  // override
  async getDataByAddresses(
    address: Address,
    chain: ChainDto,
  ): Promise<StakingPositionResponseDto[]> {
    try {
      const addressLowerCase = address.toLowerCase();

      const web3Provider = this.web3Provider.getForChain(chain.abbr);
      const multicall = new LocalMultiCall(web3Provider, this.logger);
      const stakedPosition: StakingInterface[] = [];
      await multicall.getStakedPositions(stakedPosition, addressLowerCase, chain.abbr);
      const poolsAddresses = await multicall.getVaultPoolsInfo(stakedPosition, chain.abbr);
      await Promise.all([
        multicall.getVaultUsersRewards(stakedPosition, chain.abbr),
        multicall.checkAutoTokenStake(stakedPosition, addressLowerCase, poolsAddresses),
      ]);

      this.logger.log(
        `Staked pools numbers - ${stakedPosition?.map((position) => position.poolNum).toString()}`,
      );

      await multicall.getTotalSupplies(poolsAddresses, stakedPosition);

      const lpStaked: StakingInterface[] = [];
      const tokensAddresses = new Set<string>();
      tokensAddresses.add(autofarmRewardToken);
      await Promise.all(
        stakedPosition.map(async (staking) => {
          try {
            const poolContract = new web3Provider.eth.Contract(
              lpTokenAbi as AbiItem[],
              staking.contractAddress,
            );
            const reserves = await poolContract.methods.getReserves().call();
            // eslint-disable-next-line no-underscore-dangle
            staking.reserve0 = reserves._reserve0;
            // eslint-disable-next-line no-underscore-dangle
            staking.reserve1 = reserves._reserve1;
            staking.isLp = true;
            lpStaked.push(staking);
          } catch (e) {
            staking.isLp = false;
            tokensAddresses.add(staking.contractAddress);
          }
        }),
      );

      // TODO getTokens coefficients and totalSupply via web3
      // const tokensInfoMap = await multicall.getTokensInfoMap(stakedPosition, tokensAddresses);

      await multicall.getToken0AndToken1FromLp(lpStaked, tokensAddresses);
      const tokenAddressesArray = Array.from(tokensAddresses);
      const [{ data }, price] = await Promise.all([
        this.accountService.getAssets(tokenAddressesArray, [chain.id]),
        this.priceService.getTokenPricesFetch(tokenAddressesArray, chain.id),
      ]);

      const autofarmPools: AutofarmApiPools = await this.autofarmApiService.getAutofarmPoolsData();

      const assetsMap = new Map<string, Asset>();
      data.forEach((asset) => assetsMap.set(asset.address, asset));

      const claimableToken = AutofarmProtocol.getClaimableToken(assetsMap, price.prices);
      const stakingPositionsMap = this.getStakingPositionDtosMap(
        autofarmPools,
        stakedPosition,
        assetsMap,
        price.prices,
        claimableToken,
        chain.abbr,
      );

      return this.getResponse(stakingPositionsMap);
    } catch (e) {
      this.logger.error(e.message);
      throw e;
    }
  }

  private getResponse(
    stakingPositionsMap: Map<string, IntegrationStakingPositionDto[]>,
  ): StakingPositionResponseDto[] {
    const responseData: StakingPositionResponseDto[] = [];
    stakingPositionsMap.forEach((value) => {
      const stakingResponse = new StakingPositionResponseDto();
      stakingResponse.stakingPositions = value;
      responseData.push(stakingResponse);
    });
    return responseData;
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
