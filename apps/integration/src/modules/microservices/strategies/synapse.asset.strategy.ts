import { AbiService } from 'apps/integration/src/framework/support/EVM/AbiModule/AbiService';

import { Injectable } from '@nestjs/common';

import { ChainIdEnum } from '@app/common';
import { toDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { Ownable } from '@app/common/web3provider/contracts/Ownable';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { TokenDataStrategy } from './strategy.interface';
import { UniswapV2LpStrategy } from './uniswap.v2.asset.strategy';

@Injectable()
export class SynapseStrategy extends UniswapV2LpStrategy implements TokenDataStrategy {
  constructor(protected multicall: MulticallAggregator, protected abiService: AbiService) {
    super(multicall);
  }

  async fillMissingData(
    tokens: any[],
    prices: any,
    chain: number,
  ): Promise<{ tokens: any[]; prices: any }> {
    return { tokens, prices };
    if (chain === ChainIdEnum.eth) {
      return super.fillMissingData(tokens, prices, chain);
    }
    return this.synapseStrategy(tokens, prices, chain);
  }

  async synapseStrategy(
    tokens: any[],
    prices: any,
    chain: number,
  ): Promise<{ tokens: any[]; prices: any }> {
    const lpContractCalls = new Map();
    const lpTokensMap = new Map();
    tokens?.forEach((token) => {
      if (token.isLp) {
        const owner = new Ownable(token.address);
        const lpContract = new ERC20(token.address);
        lpTokensMap.set(token.address, token);
        lpContractCalls.set(token.address, owner.owner());
        lpContractCalls.set(`${token.address}.totalSupply`, lpContract.totalSupply());
        token.underlyingAssets.forEach((underlying) => {
          if (underlying.isLp) {
            const underlyingOwner = new Ownable(underlying.address);
            lpContractCalls.set(underlying.address, underlyingOwner.owner());
          }
        });
      }
    });

    const lpCallsResp = await this.multicall.handleInBatches(lpContractCalls, chain);
    const ownerAbi = await this.abiService.fetchAbi(
      Array.from(lpCallsResp.values())[0]?.output.data,
      chain,
    );
    const getVirtualPriceAbi = ownerAbi.find((item) => item.name === 'getVirtualPrice');
    const getTokenBalanceAbi = ownerAbi.find((item) => item.name === 'getTokenBalance');
    const calls = new Map();
    Array.from(lpTokensMap.entries()).forEach(([key, value]) => {
      const owner = lpCallsResp.get(key).output.data;
      const ownerContract = new DynamicContract(owner);
      value.totalSupply = toDecimals(
        lpCallsResp.get(`${key}.totalSupply`).output.data,
        value.decimals,
      );
      calls.set(`${key}.price`, ownerContract.createCall(getVirtualPriceAbi));
      value.underlyingAssets.forEach((underlying) => {
        if (underlying.isLp) {
          const underlyingOwner = new DynamicContract(
            lpCallsResp.get(underlying.address).output.data,
          );
          calls.set(`${underlying.address}.price`, underlyingOwner.createCall(getVirtualPriceAbi));
        }
        calls.set(
          `${key}.${underlying.positionInPool}`,
          ownerContract.createCall(getTokenBalanceAbi, underlying.positionInPool),
        );
      });
    });

    const results = await this.multicall.handleInBatches(calls, chain);
    Array.from(lpTokensMap.values()).forEach((token: any) => {
      prices[token.address] = toDecimals(
        results.get(`${token.address}.price`)?.output.data,
        token.decimals,
      );
      token.underlyingAssets.forEach((underlying) => {
        underlying.reserve = toDecimals(
          results.get(`${token.address}.${underlying.positionInPool}`).output.data,
          underlying.decimals,
        );
        prices[underlying.address] =
          prices[underlying.address] ||
          toDecimals(results.get(`${underlying.address}.price`)?.output.data, underlying.decimals);
      });
    });
    return { tokens, prices };
  }
}
