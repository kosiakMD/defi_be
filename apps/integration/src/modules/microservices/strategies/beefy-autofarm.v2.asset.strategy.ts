import { AssembledAssetInterface } from '@sdk/assets/interfaces';
import BigNumber from 'bignumber.js';

import { Injectable } from '@nestjs/common';

import { normalizeDecimals } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { UniswapV2Pair } from '@app/common/web3provider/contracts/UniswapV2Pair';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { TokenDataStrategy } from './strategy.interface';

@Injectable()
export class BeefyAutofarmLpStrategy implements TokenDataStrategy {
  constructor(protected multicall: MulticallAggregator) {}

  protected getLpTokenContract(token: string) {
    return new UniswapV2Pair(token);
  }

  async fillMissingData(tokens: any[], prices: any, chain: number) {
    const calls = new Map();
    // get the missing calls
    tokens.forEach(([address, token]) => {
      const contract = this.getLpTokenContract(address);
      calls.set(`${token.address}.totalSupply()`, contract.totalSupply());

      if (token.underlying?.length !== 2) return;
      if (token.underlying.every((t) => !!t.reserve)) return;

      calls.set(`${token.address}.getReserves()`, contract.getReserves());
      token.underlying.forEach((asset) => {
        const c = new ERC20(asset.address);
        calls.set(`${asset.address}.totalSupply()`, c.totalSupply());
      });
    });

    // fetch results
    const results = await this.multicall.handleInBatches(calls, chain);

    // fill in missing data
    const updatedTokens: [string, AssembledAssetInterface][] = tokens.map(([address, token]) => {
      // always get totalSupply and attach to token
      const totalSupply = results.get(`${address}.totalSupply()`).output.data;
      token.totalSupply = normalizeDecimals(totalSupply, token.decimals);

      if (token.underlying?.length !== 2) return [address, token];

      let reserve0, reserve1;
      if (token.underlying.every((t) => !t.reserve)) {
        const { _reserve0, _reserve1 } = results.get(`${address}.getReserves()`).output.data;
        reserve0 = _reserve0;
        reserve1 = _reserve1;
      } else {
        reserve0 = token.underlying[0].reserve;
        reserve1 = token.underlying[1].reserve;
      }

      token.underlying.forEach((u) => {
        u.totalSupply = normalizeDecimals(
          results.get(`${u.address}.totalSupply()`).output.data,
          u.decimals,
        );

        u.reserve = normalizeDecimals(
          (u.reserve = u.positionInPool === 0 ? reserve0 : reserve1).toString(),
          u.decimals,
        );
      });

      if (token.underlying.every((x) => !x.price)) return [address, token];

      if (!token.underlying[0].price) {
        token.underlying[0].price = new BigNumber(reserve1)
          .times(token.underlying[1].price)
          .dividedBy(reserve0)
          .toNumber();
      }

      if (!token.underlying[1].price) {
        token.underlying[1].price = new BigNumber(reserve0)
          .times(token.underlying[0].price)
          .dividedBy(reserve1)
          .toNumber();
      }

      if (!token.price) {
        const tvl0 = new BigNumber(reserve0).times(token.underlying[0].price);
        const tvl1 = new BigNumber(reserve1).times(token.underlying[1].price);

        token.price = new BigNumber(tvl0.plus(tvl1)) //
          .div(token.totalSupply)
          .toNumber();
      }

      return [address, token];
    });

    return { tokens: updatedTokens, prices };
  }
}
