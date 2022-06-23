import { AbiService } from 'apps/integration/src/framework/support/EVM/AbiModule/AbiService';

import { Injectable } from '@nestjs/common';

import { normalizeDecimals } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { UniswapV2Pair } from '@app/common/web3provider/contracts/UniswapV2Pair';
import { IronFinanceLpPairs } from '@app/common/web3provider/contracts/protocols/ironFinance/IronFinanceLpPairs';
import { IronFinanceLpSwap } from '@app/common/web3provider/contracts/protocols/ironFinance/IronFinanceLpSwap';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { TokenDataStrategy } from './strategy.interface';
import { UniswapV2LpStrategy } from './uniswap.v2.asset.strategy';

@Injectable()
export class IronFinanceStrategy extends UniswapV2LpStrategy implements TokenDataStrategy {
  constructor(protected multicall: MulticallAggregator, protected abiService: AbiService) {
    super(multicall);
  }

  protected getLpTokenContract(token: string): UniswapV2Pair {
    return new IronFinanceLpPairs(token);
  }

  async fillMissingData(
    tokens: any[],
    prices: any,
    chain: number,
  ): Promise<{ tokens: any[]; prices: any }> {
    const resultsListSwapAddresses = await this.getSwapAddresses(tokens, chain);

    const calls = new Map();
    tokens.forEach((token: any) => {
      const contract = this.getLpTokenContract(token.address);

      calls.set(`${token.address}.totalSupply()`, contract.totalSupply());
      if (!token.underlyingAssets || token.underlyingAssets.length < 2) return;

      // using abi for "swap contract" for getting reserves of underline tokens
      const contractSwap = new IronFinanceLpSwap(
        resultsListSwapAddresses.get(`${token.address}.swapAddress`)?.output.data,
      );
      calls.set(`${token.address}.getReserves()`, contractSwap.getTokenBalances());
      calls.set(`${token.address}.getTokens()`, contractSwap.getTokens());
      token.underlyingAssets?.forEach((asset) => {
        const c = new ERC20(asset.address);
        calls.set(`${asset.address}.totalSupply()`, c.totalSupply());
      });
    });
    const results = await this.multicall.handleInBatches(calls, chain);

    tokens.forEach((token: any) => {
      const totalSupply = results.get(`${token.address}.totalSupply()`).output.data;
      token.totalSupply = normalizeDecimals(totalSupply, token.decimals);
      if (!token.underlyingAssets || token.underlyingAssets.length < 2) return;

      const reserves = results.get(`${token.address}.getReserves()`).output.data;
      const tokens = results.get(`${token.address}.getTokens()`).output.data;
      const mappedReserves = new Map<string, string>(
        reserves.map((r, idx) => [tokens[idx].toLowerCase(), r]),
      );
      token.underlyingAssets.forEach((u) => {
        u.totalSupply = normalizeDecimals(
          results.get(`${u.address}.totalSupply()`).output.data,
          u.decimals,
        );

        u.reserve = normalizeDecimals(mappedReserves.get(u.address), u.decimals);
      });
    });
    return { tokens, prices };
  }

  async getSwapAddresses(tokens, chain) {
    const callsSwapAddresses = new Map();
    // getting swap contract addresses to get reserves from them
    const filterTokens = tokens.filter((t) => t.underlyingAssets?.length >= 2);
    filterTokens.forEach((token: any) => {
      const contract = this.getLpTokenContract(token.address);
      callsSwapAddresses.set(`${token.address}.swapAddress`, contract.swap());
    });
    return await this.multicall.handleInBatches(callsSwapAddresses, chain);
  }
}
