import { Injectable } from '@nestjs/common';

import { Address, ChainIdEnum, CurrencyIdEnum } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { CurveAddresses } from '@app/common/constant/curve.addresses';
import { CallData } from '@app/common/dto/CallData';
import { CurveLiquidityPoolFeature } from '@app/common/jobs/pools';
import { concatStrings, normalizeDecimals } from '@app/common/utils';

import { CurveLpAbi } from './abis/CurveLpAbi';
import { CurveRegistryAbi } from './abis/CurveRegistryAbi';
import { ERC20Abi } from './abis/ERC20Abi';
import { CurvePoolBase } from './curve.pool.base';

@Injectable()
export class CurvePoolsArbi extends CurvePoolBase {
  chain = ChainIdEnum.arbi;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);

  protected registryPoolsMap = new Map<string, string>();

  getUnderlyingBalancesLabel(poolAddress: Address) {
    return concatStrings(CurveRegistryAbi.getUnderlyingBalances.name, poolAddress);
  }

  getBalancesV2Label(poolAddress: Address, lpAddress: string) {
    return concatStrings(CurveRegistryAbi.getBalances.name, poolAddress, lpAddress);
  }

  async fillChainData(): Promise<CurveLiquidityPoolFeature[]> {
    [this.registryV1Contract, this.registryV2Contract, this.metaPoolFactoryContract] =
      await this.getRegistryAddresses();

    const calls = this.getCallsMap();
    const tokenAddresses = this.mapping.flatMap((curveLiquidityPoolFeature) => {
      return curveLiquidityPoolFeature.tokens.flatMap((token) => [
        this.handleMainCoinAddress(token),
        ...token.tokens.flatMap((t) => [
          this.handleMainCoinAddress(t),
          ...t.tokens.map((a) => this.handleMainCoinAddress(a)),
        ]),
      ]);
    });

    const [{ prices }, multicallResponses] = await Promise.all([
      this.priceService.getCurrentPrices(tokenAddresses, CurrencyIdEnum.usd, this.chain),
      this.multicallService.handleInBatches(calls, this.chain),
    ]);

    const resultMapping = [];
    this.mapping.forEach((curveLiquidityPoolFeature) => {
      if (
        resultMapping.some(
          (position) =>
            position.address === curveLiquidityPoolFeature.address &&
            position.registry === curveLiquidityPoolFeature.registry,
        ) ||
        excludePools.some((address) => address === curveLiquidityPoolFeature.address)
      ) {
        return;
      }

      try {
        const underlyingBalances = curveLiquidityPoolFeature.tokens.some(
          (token) => token.tokens.length,
        )
          ? multicallResponses.get(
              this.getUnderlyingBalancesLabel(curveLiquidityPoolFeature.address),
            ).output.data
          : multicallResponses.get(
              this.getBalancesV2Label(
                curveLiquidityPoolFeature.address,
                curveLiquidityPoolFeature.lpToken.address,
              ),
            ).output.data;

        const lpTokenTotalSupply = multicallResponses
          .get(this.getTotalSupplyLabel(curveLiquidityPoolFeature.lpToken.address))
          ?.output.data.toString();

        curveLiquidityPoolFeature.lpToken.totalSupply =
          normalizeDecimals(lpTokenTotalSupply, curveLiquidityPoolFeature.lpToken.decimals) || null;

        curveLiquidityPoolFeature.tokens.sort((a, b) => a.positionInPool - b.tokens.length);

        const tokens = [];
        let index = 0;
        curveLiquidityPoolFeature.tokens.map(async (coin) => {
          const coinTotalSupply = multicallResponses
            .get(this.getTotalSupplyLabel(coin.address))
            ?.output.data.toString();
          coin.totalSupply = normalizeDecimals(coinTotalSupply, coin.decimals);

          if (coin.tokens?.length) {
            let lpValue = 0;
            coin.tokens.forEach((poolToken) => {
              const poolTokenPrice = Number(prices[this.handleMainCoinAddress(poolToken)]);
              poolToken.reserve = poolToken.balance = normalizeDecimals(
                underlyingBalances[index + poolToken.positionInPool],
                poolToken.decimals,
              );

              poolToken.price = poolTokenPrice;
              poolToken.value = poolToken.balance * poolTokenPrice;
              lpValue += poolToken.value;
              tokens.push(poolToken);
              if (!poolToken.price) {
                this.logger.warn(
                  `Missing Curve token price Chain: ${this.chain}, address: ${poolToken.address} - (${poolToken.symbol})`,
                );
              }
            });
            index += coin.tokens.length;
            curveLiquidityPoolFeature.stats.tvl += lpValue;
          } else {
            const reserve = normalizeDecimals(underlyingBalances[index].toString(), coin.decimals);

            coin.reserve = coin.balance = reserve;
            coin.price = Number(prices[this.handleMainCoinAddress(coin)]);
            coin.value = coin.price * reserve;
            curveLiquidityPoolFeature.stats.tvl += coin.value;
            index++;
            tokens.push(coin);
            if (!coin.price) {
              this.logger.warn(
                `Missing Curve token price Chain: ${this.chain}, address: ${coin.address} - (${coin.symbol})`,
              );
            }
          }
        });
        curveLiquidityPoolFeature.tokens = tokens;
        resultMapping.push(curveLiquidityPoolFeature);
      } catch (e) {
        this.logger.error(e, 'fillChainData');
      }
    });

    return resultMapping;
  }

  getCallsMap(): Map<string, CallData> {
    const calls = new Map<string, CallData>();
    this.mapping.forEach((poolFeature) => {
      if (excludePools.some((address) => address === poolFeature.address)) {
        return;
      }
      const lpTokenContract = new CurveLpAbi(poolFeature.lpToken.address);
      const registry = new CurveRegistryAbi(poolFeature.registry);

      if (poolFeature.registry !== this.metaPoolFactoryContract) {
        calls.set(
          this.getTotalSupplyLabel(poolFeature.lpToken.address),
          lpTokenContract.totalSupply(),
        );
      }

      if (poolFeature.tokens.some((token) => token.tokens?.length)) {
        calls.set(
          this.getUnderlyingBalancesLabel(poolFeature.address),
          registry.getUnderlyingBalances(poolFeature.address),
        );
      } else {
        calls.set(
          this.getBalancesV2Label(poolFeature.address, poolFeature.lpToken.address),
          poolFeature.registry === this.metaPoolFactoryContract
            ? registry.getMetaPoolBalances(poolFeature.address)
            : registry.getBalances(poolFeature.address),
        );
      }

      poolFeature.tokens.forEach((coin) => {
        if (poolFeature.registry !== this.metaPoolFactoryContract) {
          const tokenContract = new ERC20Abi(
            coin.address === ZERO_ADDRESS ? CurveAddresses.arbiWeth : coin.address,
          );
          calls.set(this.getTotalSupplyLabel(coin.address), tokenContract.totalSupply());
        }
      });
    });
    return calls;
  }
}

export const excludePools = ['0xa827a652ead76c6b0b3d19dba05452e06e25c27e'];
