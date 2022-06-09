import BigNumber from 'bignumber.js';

import { Injectable } from '@nestjs/common';

import { normalizeDecimals } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { UniswapV2Pair } from '@app/common/web3provider/contracts/UniswapV2Pair';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { TokenDataStrategy } from './strategy.interface';

@Injectable()
export class UniswapV2LpStrategy implements TokenDataStrategy {
  constructor(protected multicall: MulticallAggregator) {}

  protected getLpTokenContract(token: string) {
    return new UniswapV2Pair(token);
  }

  async fillMissingData(tokens: any[], prices: any, chain: number) {
    const calls = new Map();
    // get the missing calls
    tokens.forEach((token: any) => {
      const contract = this.getLpTokenContract(token.address);
      calls.set(`${token.address}.totalSupply()`, contract.totalSupply());

      if (token.underlyingAssets?.length !== 2) return;
      calls.set(`${token.address}.getReserves()`, contract.getReserves());
      calls.set(`${token.address}.token0()`, contract.token0());
      calls.set(`${token.address}.token1()`, contract.token1());
      token.underlyingAssets.forEach((asset) => {
        const c = new ERC20(asset.address);
        calls.set(`${asset.address}.totalSupply()`, c.totalSupply());
      });
    });

    // fetch results
    const results = await this.multicall.handleInBatches(calls, chain);

    // fill in missing data
    tokens.forEach((token: any) => {
      // always get totalSupply and attach to token
      const totalSupply = results.get(`${token.address}.totalSupply()`).output.data;
      token.totalSupply = normalizeDecimals(totalSupply, token.decimals);

      if (token.underlyingAssets?.length !== 2) return;

      const token0Address = results.get(`${token.address}.token0()`).output.data.toLowerCase();
      const token1Address = results.get(`${token.address}.token1()`).output.data.toLowerCase();
      const { _reserve0, _reserve1 } = results.get(`${token.address}.getReserves()`).output.data;

      const underlying0 = token.underlyingAssets.find((a) => a.address === token0Address);
      const underlying1 = token.underlyingAssets.find((a) => a.address === token1Address);

      const reserve0 = normalizeDecimals(_reserve0.toString(), underlying0.decimals);
      const reserve1 = normalizeDecimals(_reserve1.toString(), underlying1.decimals);

      token.underlyingAssets.forEach((u) => {
        u.totalSupply = normalizeDecimals(
          results.get(`${u.address}.totalSupply()`).output.data,
          u.decimals,
        );

        u.reserve = normalizeDecimals(
          (u.reserve = u.positionInPool === 0 ? _reserve0 : _reserve1).toString(),
          u.decimals,
        );
      });

      if (!Number(prices[token0Address]) && !Number(prices[token1Address])) return;

      // calculate/fill in missing base token prices based on current LP reserves
      if (!prices[token0Address]) {
        prices[token0Address] = new BigNumber(reserve1)
          .times(Number(prices[token1Address]))
          .dividedBy(reserve0)
          .toNumber();
      }

      if (!prices[token1Address]) {
        prices[token1Address] = new BigNumber(reserve0)
          .times(Number(prices[token0Address]))
          .dividedBy(reserve1)
          .toNumber();
      }

      // calculate/fill the LP token price into the price array
      const tvl0 = new BigNumber(reserve0 * Number(prices[token0Address]));
      const tvl1 = new BigNumber(reserve1 * Number(prices[token1Address]));

      prices[token.address] = new BigNumber(tvl0.plus(tvl1)) //
        .div(token.totalSupply)
        .toNumber();
    });
    return { tokens, prices };
  }
}
