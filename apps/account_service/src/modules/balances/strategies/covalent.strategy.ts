import BigNumber from 'bignumber.js';

import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger, TokenBalance } from '@app/common';
import { getAbsoluteChainId, getInternalChainId } from '@app/common/utils/chains';

import { BalancesLoadingStrategy } from '../../../common/interfaces';
import { Covalent } from '../../../common/interfaces/covalent.interface';
import { CovalentService } from '../../../common/providers/3rdparty/covalent.service';
import { BalancesRequest } from '../../../common/types';
import { replaceIncorrectTokenAddress } from '../../../common/utils/token';

export class CovalentBalancesStrategy implements BalancesLoadingStrategy {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly service: CovalentService,
  ) {}

  async getBalances(request: BalancesRequest): Promise<TokenBalance[]> {
    const message = `Covalent balances loading for address ${request.address} and chain ${request.chainId}`;
    this.logger.time(message);

    const chainId = getAbsoluteChainId(request.chainId);
    const balances = await this.service.getBalances(request.address, chainId as number);
    const response = this.mapCovalentResponse(balances);

    this.logger.timeEnd(message);

    return response;
  }

  private mapCovalentResponse(response: Covalent.Balance): TokenBalance[] {
    return (
      response.items
        .filter(({ contract_decimals: decimals }) => !!decimals)
        // NOTE: Covalent returns crazy prices sometimes so this is workaround for this
        .filter(({ quote_rate: price }) => price && price < 100000)
        .map((token) => CovalentBalancesStrategy.mapCovalentItem(response.chain_id, token))
    );
  }

  private static mapCovalentItem(
    chainId: number,
    token: Covalent.TokenBalance | Covalent.PoolTokenBalance,
  ): TokenBalance {
    const decimalsAmount = new BigNumber(token.balance)
      .div(10 ** token.contract_decimals)
      .toNumber();
    const tokenPriceUSD = token.quote_rate || null;
    const totalPriceUSD = tokenPriceUSD * decimalsAmount || null;
    const internalChainId = getInternalChainId(chainId);
    const tokenAddress = replaceIncorrectTokenAddress(token.contract_address, internalChainId);

    return {
      amount: token.balance,
      decimalsAmount,
      tokenPriceUSD,
      totalPriceUSD: totalPriceUSD || null,
      token: {
        chainId: internalChainId,
        decimals: token.contract_decimals,
        symbol: token.contract_ticker_symbol,
        name: token.contract_name,
        address: tokenAddress,
      },
    };
  }
}
