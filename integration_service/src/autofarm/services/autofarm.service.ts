import BigNumber from 'bignumber.js';
import { classToClass } from 'class-transformer';
import { AbiItem } from 'web3-utils';

import { HttpService, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum } from '../../common/enum';
import { Address } from '../../common/types';

import { Logger } from '../../Logger/Logger.service';
import { AccountService } from '../../account/account.service';
import { Web3Provider } from '../../chain/web3.provider';
import { CurrentPricesPayload } from '../../dto/price.response.dto';
import {
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  LPToken,
  PoolTokenDto,
  IntegrationStakingPositionDto,
  StakingPositionResponseDto,
  ClaimableDto,
} from '../../integrations/integrations.dto';
import { Asset, ERC20Token } from '../../interfaces/transactions.interfaces';
import { PriceService } from '../../price/price.service';
import { decimalsDivider } from '../../utils/util';
import { AutofarmUser, StakingInterface } from '../autofarm.interfaces';
import { LocalMultiCall } from '../multicall/local.multi.call';
import { autofarmFactoriesMap, autofarmRewardToken, lpTokenAbi } from '../multicall/util';
import { AutofarmSubgraph } from './autofarm.subgraph';

@Injectable()
export class AutofarmService {
  constructor(
    protected readonly web3Provider: Web3Provider,
    protected readonly httpService: HttpService,
    protected readonly autofarmSubgraph: AutofarmSubgraph,
    protected readonly assetsService: AccountService,
    protected readonly priceService: PriceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
  ) {}

  async getDataByAddresses(
    address: Address,
    chainId: ChainIdEnum,
  ): Promise<StakingPositionResponseDto[]> {
    try {
      const addressLowerCase = address.toLowerCase();
      const autofarmUsers: AutofarmUser[] = await this.autofarmSubgraph.getSubgraphData([
        addressLowerCase,
      ]);

      const stakedPosition: StakingInterface[] = [];
      autofarmUsers.forEach((user) =>
        user.balances.forEach((balance) => {
          if (Number(balance.amount) >= 0) {
            stakedPosition.push({
              poolNum: Number(balance.id.slice(balance.id.indexOf('-') + 1)),
              userAddress: user.id,
              amount: balance.amount,
            });
          }
        }),
      );

      const web3Provider = this.web3Provider.web3Map.get(chainId);
      const multicall = new LocalMultiCall(web3Provider, this.logger);
      const poolsAddresses = await multicall.getVaultPoolsInfo(stakedPosition, chainId);
      await Promise.all([
        multicall.getVaultUsersInfo(stakedPosition, chainId),
        multicall.checkAutoTokenStake(stakedPosition, addressLowerCase, poolsAddresses),
      ]);

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

      await multicall.getToken0AndToken1FromLp(lpStaked, tokensAddresses);
      const tokenAddressesArray = Array.from(tokensAddresses);
      const [{ data }, price] = await Promise.all([
        this.assetsService.getAssets(tokenAddressesArray, [chainId]),
        this.priceService.getTokenPricesFetch(tokenAddressesArray, chainId),
      ]);

      const assetsMap = new Map<string, Asset>();
      data.forEach((asset) => assetsMap.set(asset.address, asset));

      const claimableToken = AutofarmService.getClaimableToken(assetsMap, price.prices);
      const stakingPositionsMap = this.getStakingPositionDtosMap(
        stakedPosition,
        assetsMap,
        price.prices,
        claimableToken,
        chainId,
      );

      return this.getResponse(autofarmUsers, stakingPositionsMap);
    } catch (e) {
      this.logger.error(e.message);
      throw e;
    }
  }

  private getResponse(
    autofarmUsers: AutofarmUser[],
    stakingPositionsMap: Map<string, IntegrationStakingPositionDto[]>,
  ): StakingPositionResponseDto[] {
    const responseData: StakingPositionResponseDto[] = [];
    for (const [key, value] of stakingPositionsMap.entries()) {
      const autofarmUser = autofarmUsers.find((user) => user.id === key);
      const stakingResponse = new StakingPositionResponseDto();
      // stakingResponse.userAddress = key;
      stakingResponse.stakingPositions = value;
      stakingResponse.totalValue = Number(autofarmUser?.totalAmount);

      responseData.push(stakingResponse);
    }
    return responseData;
  }

  private getStakingPositionDtosMap(
    stakingPositions: StakingInterface[],
    assets: Map<string, Asset>,
    prices: CurrentPricesPayload,
    claimAbleToken: IntegrationClaimableTokenDto,
    chain: ChainIdEnum,
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
        .toString();
      rewardToken.claimableData = claimable;
      const response = new IntegrationStakingPositionDto();
      response.address = autofarmFactoriesMap.get(chain);
      response.poolId = String(staking.poolNum);
      response.staked = staking.amount;
      response.rewardToken = rewardToken;
      response.stakingToken = staking.isLp
        ? AutofarmService.getStakingLpToken(staking, assets, prices)
        : AutofarmService.getStakingErc20Token(staking, assets, prices);
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
  ): IntegrationERC20TokenDto {
    const asset = assets.get(staking.contractAddress);
    const erc20Token = new IntegrationERC20TokenDto();
    AutofarmService.setFieldsFromAsset(asset, erc20Token);
    erc20Token.totalSupply = staking.totalSupply;
    erc20Token.price = prices[staking.contractAddress];
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
    AutofarmService.setFieldsFromAsset(lpAsset, lpToken);
    lpToken.totalSupply = staking.totalSupply;
    lpToken.tokens = [
      AutofarmService.getPairToken(staking, token1, prices, 1),
      AutofarmService.getPairToken(staking, token0, prices, 0),
    ];

    return lpToken;
  }

  private static getClaimableToken(
    assets: Map<string, Asset>,
    price: CurrentPricesPayload,
  ): IntegrationClaimableTokenDto {
    const asset = assets.get(autofarmRewardToken);
    const claimableToken = new IntegrationClaimableTokenDto();
    claimableToken.price = price[autofarmRewardToken];
    AutofarmService.setFieldsFromAsset(asset, claimableToken);

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
    AutofarmService.setFieldsFromAsset(asset, poolToken);
    poolToken.price = prices[asset.address];
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
