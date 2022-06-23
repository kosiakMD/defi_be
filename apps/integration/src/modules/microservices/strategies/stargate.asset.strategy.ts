import { AbiService } from 'apps/integration/src/framework/support/EVM/AbiModule/AbiService';

import { Injectable } from '@nestjs/common';

import { toDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { TokenDataStrategy } from './strategy.interface';

@Injectable()
export class StargateAssetStrategy implements TokenDataStrategy {
  constructor(protected multicall: MulticallAggregator, protected abiService: AbiService) {}

  async fillMissingData(
    tokens: any[],
    prices: any,
    chain: number,
  ): Promise<{ tokens: any[]; prices: any }> {
    const calls = new Map();
    const lp = tokens.find((token) => token.isLp);
    const lpAbi = await this.abiService.fetchAbi(lp.address, chain);
    const amountLpToLDAbi = lpAbi.find((item) => item.name === 'amountLPtoLD');

    tokens.forEach((token: any) => {
      if (token.isLp) {
        const contract = new DynamicContract(token.address);
        calls.set(
          `${token.address}.amount`,
          contract.createCall(amountLpToLDAbi, 10 ** token.decimals),
        );
      }
    });
    const results = await this.multicall.handleInBatches(calls, chain);
    tokens.forEach((token: any) => {
      if (token.isLp) {
        prices[token.address] = toDecimals(
          results.get(`${token.address}.amount`).output.data,
          token.underlyingAssets[0]?.decimals,
        );
      }
    });
    return { tokens, prices };
  }
}
