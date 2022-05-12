import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, ChainWrappedTokens, CurrencyIdEnum } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { concatStrings, normalizeDecimals } from '@app/common/utils';
import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { toDecimals } from '../../utils/number';
import { CurveLpAbi } from './abis/CurveLpAbi';
import { CurveRegistryAbi } from './abis/CurveRegistryAbi';
import { ERC20Abi } from './abis/ERC20Abi';
import { CurveGaugesBase } from './curve.gauges.base';
import { LocalMultiCall } from './local.multicall';

@Injectable()
export class CurveGaugesArbi extends CurveGaugesBase {
  chain = ChainIdEnum.arbi;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);

  protected mapping = [];
  protected localMulticall;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly storeService: StoreService,
    protected readonly multicallService: MulticallAggregator,
    protected readonly web3Provider: Web3ProviderService,
    protected readonly priceService: PriceService,
  ) {
    super(logger, accountService, storeService, multicallService, web3Provider, priceService);
    this.localMulticall = new LocalMultiCall(
      this.web3Provider.getInstanceByChainId(this.chain),
      this.logger,
    );
  }

  async updateWithChainData(): Promise<any[]> {
    try {
      const poolsSubgraphData = await this.getPoolsDataMap();
      const stakingTokensPools = new Map();
      this.mapping.forEach((staking) => {
        stakingTokensPools.set(staking.stakingToken.address, staking.pool);
      });

      const calls = this.getCallsMapV2(stakingTokensPools);

      const tokenAddresses = [];
      this.mapping.forEach((stakingPosition) => {
        if (!stakingPosition.stakingToken.tokens.length) {
          tokenAddresses.push(stakingPosition.stakingToken.address);
        } else {
          stakingPosition.stakingToken.tokens?.forEach((token) => {
            tokenAddresses.push(token.address);
            token?.tokens?.forEach((t) => tokenAddresses.push(t.address));
          });
        }
        stakingPosition.rewards?.forEach((reward) => tokenAddresses.push(reward.address));
      });

      const [{ prices }, multicallResponses] = await Promise.all([
        this.priceService.getCurrentPrices(tokenAddresses, CurrencyIdEnum.usd, this.chain),
        this.multicallService.handleInBatches(calls, this.chain),
      ]);

      this.mapping = this.mapping.map((position) => {
        const getTokenReserve = (address: Address, positionInPool: number) =>
          multicallResponses
            .get(this.getPoolBalances(stakingTokensPools.get(address), positionInPool))
            ?.output.data.toString();

        const lpVirtualPrice = multicallResponses.get(
          this.getVirtualPrice(position.stakingToken.address),
        ).output.data;

        position.poolName =
          multicallResponses.get(this.getPoolName(position.pool))?.output.data ?? position.poolName;

        position.stakingToken.price = normalizeDecimals(
          lpVirtualPrice,
          position.stakingToken.decimals,
        );

        const staked = multicallResponses
          .get(this.getGaugeLpPoolBalanceOf(position.stakingToken.address))
          ?.output.data.toString();

        const lpTokenTotalSupply = multicallResponses
          .get(this.getTotalSupplyLabel(position.stakingToken.address))
          ?.output.data.toString();

        position.stakingToken.totalSupply = normalizeDecimals(
          lpTokenTotalSupply,
          position.stakingToken.decimals,
        );

        position.staked = toDecimals(staked, position.stakingToken.decimals);
        position.stakingToken.balance = position.staked;

        position.rewards = position.rewards
          ?.map((reward) => {
            reward.price = Number(prices[reward.address]);
            reward.apr = null;
            return reward;
          })
          .filter((reward) => reward.apr !== undefined);

        const poolSubgraphData = poolsSubgraphData.get(position.pool?.toLowerCase());

        position.stats.poolApy = poolSubgraphData?.apy;
        position.stakingToken.tokens?.forEach((coin) => {
          const coinReserve = getTokenReserve(position.stakingToken.address, coin.positionInPool);
          const coinTotalSupply = multicallResponses
            .get(this.getTotalSupplyLabel(coin.address))
            ?.output.data.toString();
          const coinVirtualPrice = multicallResponses.get(this.getVirtualPrice(coin.address))
            ?.output.data;

          const reserveDec = normalizeDecimals(coinReserve, coin.decimals);
          const price =
            Number(prices[coin.address]) || normalizeDecimals(coinVirtualPrice, coin.decimals);

          // Reserve & Balance are the same in this context
          coin.totalSupply = normalizeDecimals(coinTotalSupply, coin.decimals);
          coin.reserve = coinReserve;
          coin.balance = reserveDec;
          coin.price = price;

          // Update parent stats
          position.stats.tvl += coin.value;

          if (!price) {
            this.logger.warn(
              `Missing Curve token price Chain: ${this.chain}, address: ${coin.address} - (${coin.symbol})`,
            );
          }

          if (coin.tokens?.length) {
            let lpValue = 0;
            coin.tokens?.forEach((underlyingToken) => {
              const coinReserve = getTokenReserve(coin.address, underlyingToken.positionInPool);
              const coinReserveDec = toDecimals(coinReserve, underlyingToken.decimals);
              underlyingToken.reserve = underlyingToken.balance = this.getUnderlyingTokensBalances(
                coin.balance,
                coin.totalSupply,
                coinReserveDec,
              );
              underlyingToken.price = Number(prices[underlyingToken.address.toLowerCase()]);
              underlyingToken.value = underlyingToken.reserve * underlyingToken.price;
              lpValue += underlyingToken.value;

              if (!underlyingToken.price) {
                this.logger.warn(
                  `Missing Curve token price Chain: ${this.chain}, address: ${underlyingToken.address} - (${underlyingToken.symbol})`,
                );
              }
            });
            coin.value = lpValue;
          } else {
            coin.value = reserveDec * price;
            position.stats.tvl += coin.value;
          }
        });
        delete position.registry;
        delete position.pool;
        return position;
      });

      return this.mapping;
    } catch (e) {
      this.logger.error(e, 'updateWithChainData');
    }
  }

  getCallsMapV2(stakingPoolsMap: Map<string, string>) {
    const calls = new Map();

    this.mapping.forEach((staking) => {
      const registry = new CurveRegistryAbi(staking.registry);
      const stakingTokenContract = new CurveLpAbi(staking.stakingToken.address);
      const curvePool = new CurveLpAbi(staking.pool);

      staking.stakingToken.tokens.forEach((token) => {
        calls.set(
          this.getPoolBalances(staking.pool, token.positionInPool),
          curvePool.balances(token.positionInPool),
        );
      });

      if (!staking.poolName) {
        calls.set(this.getPoolName(staking.pool), registry.getPoolName(staking.pool));
      }

      calls.set(
        this.getTotalSupplyLabel(staking.stakingToken.address),
        stakingTokenContract.totalSupply(),
      );

      calls.set(
        this.getGaugeLpPoolBalanceOf(staking.stakingToken.address),
        stakingTokenContract.balanceOf(staking.address),
      );

      calls.set(this.getVirtualPrice(staking.stakingToken.address), curvePool.getVirtualPrice());

      staking.stakingToken.tokens?.forEach((coin) => {
        if (coin.tokens?.length) {
          const pool = stakingPoolsMap.get(coin.address);
          const underlyingCurvePool = new CurveLpAbi(pool);

          calls.set(this.getVirtualPrice(coin.address), underlyingCurvePool.getVirtualPrice());

          coin.tokens.forEach((token) => {
            calls.set(
              this.getPoolBalances(stakingPoolsMap.get(coin.address), token.positionInPool),
              underlyingCurvePool.balances(token.positionInPool),
            );
          });
        }

        const lpTokenContract = new ERC20Abi(
          coin.address === ZERO_ADDRESS
            ? ChainWrappedTokens[coin.symbol.toUpperCase()]
            : coin.address,
        );
        calls.set(this.getTotalSupplyLabel(coin.address), lpTokenContract.totalSupply());
      });
    });
    return calls;
  }
}
