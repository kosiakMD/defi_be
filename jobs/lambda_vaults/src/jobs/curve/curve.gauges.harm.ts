import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, ChainWrappedTokens } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { concatStrings } from '@app/common/utils';
import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { CurveLpAbi } from './abis/CurveLpAbi';
import { CurveRegistryAbi } from './abis/CurveRegistryAbi';
import { ERC20Abi } from './abis/ERC20Abi';
import { CurveApi } from './curve.api';
import { CurveGaugesBase } from './curve.gauges.base';
import { LocalMultiCall } from './local.multicall';

@Injectable()
export class CurveGaugesHarm extends CurveGaugesBase {
  chain = ChainIdEnum.harm;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);

  protected localMulticall;
  protected mapping = [];

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

  getCallsMap(lpTokensMinters: Map<string, string>) {
    const calls = new Map();

    this.mapping.forEach(async (staking) => {
      const registry = new CurveRegistryAbi(staking.registry);
      // Registry uses pool address for most calls
      const stakingTokenContract = new CurveLpAbi(staking.stakingToken.address);
      const stakingPool =
        lpTokensMinters.get(staking.stakingToken.address) ?? staking.stakingToken.address;
      const curvePool = new CurveLpAbi(stakingPool);

      staking.stakingToken.tokens.forEach((token) => {
        calls.set(
          this.getPoolBalances(stakingPool, token.positionInPool),
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

      staking.stakingToken.tokens?.forEach((coin) => {
        if (coin.tokens?.length) {
          const underlyingStakingPool = lpTokensMinters.get(coin.address) ?? coin.address;
          const underlyingCurvePool = new CurveLpAbi(underlyingStakingPool);

          coin.tokens.forEach((token) => {
            calls.set(
              this.getPoolBalances(underlyingStakingPool, token.positionInPool),
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

  protected async getPoolsDataMap() {
    const curveApi = new CurveApi(this.logger);
    const poolsApr = await curveApi.getMainPoolsAprHarm();
    return Object.entries(poolsApr).reduce((resp, [key, value]) => {
      resp.set(key, {
        price: null,
        apy: value,
      });
      return resp;
    }, new Map());
  }
}
