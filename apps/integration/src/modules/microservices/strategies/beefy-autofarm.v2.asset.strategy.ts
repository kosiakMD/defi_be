import { AssembledAssetInterface } from '@sdk/assets/interfaces';

import { Injectable } from '@nestjs/common';

import { ZERO_ADDRESS } from '@app/common/constant';
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
    for (const [address, token] of tokens) {
      if (address === ZERO_ADDRESS) continue;
      const contract = this.getLpTokenContract(address);
      calls.set(`${token.address}.totalSupply()`, contract.totalSupply());

      token.underlying.forEach((asset) => {
        const c = new ERC20(asset.address);
        calls.set(`${asset.address}.totalSupply()`, c.totalSupply());
      });
    }
    const results = await this.multicall.handleInBatches(calls, chain);

    const updatedTokens: [string, AssembledAssetInterface][] = [];

    for (const [address, token] of tokens) {
      if (address !== ZERO_ADDRESS) {
        const totalSupply = results.get(`${address}.totalSupply()`).output.data;
        token.totalSupply = normalizeDecimals(totalSupply, token.decimals);

        token.underlying.forEach((u) => {
          const totalSupply = results.get(`${u.address}.totalSupply()`).output.data;
          u.totalSupply = normalizeDecimals(totalSupply, u.decimals);
          u.reserve = normalizeDecimals(u.reserve, u.decimals);

          1;
        });
      }

      updatedTokens.push([address, token]);
    }

    return { tokens: updatedTokens, prices };
  }
}
