import BigNumber from 'bignumber.js';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { getAbsoluteChainId, getInternalChainId } from '@app/common/utils/chains';

import { Covalent } from '../../../covalent/covalent.interface';
import { CovalentService } from '../../../covalent/covalent.service';
import { replaceIncorrectTokenAddress } from '../../../utils/token';
import { TokenBalance } from '../../interfaces/balance.interfaces';
import { BalancesLoadingStrategy, BalancesRequest } from '../index';

@Injectable()
export class CovalentBalancesStrategy implements BalancesLoadingStrategy {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly service: CovalentService,
  ) {}

  async getBalances(request: BalancesRequest): Promise<TokenBalance[]> {
    const message = `Covalent balances loading for address ${request.address} and chain ${request.chainId}`;
    this.logger.time(message);

    const chainId = getAbsoluteChainId(request.chainId);
    const balances = await this.service.getBalances(request.address, chainId);
    const response = this.mapCovalentResponse(balances);

    this.logger.timeEnd(message);

    return response;
  }

  private mapCovalentResponse(response: Covalent.Balance): TokenBalance[] {
    return response.items
      .filter(({ contract_decimals: decimals }) => !!decimals)
      .map((token) => this.mapCovalentItem(response.chain_id, token));
  }

  private mapCovalentItem(
    chainId: number,
    token: Covalent.TokenBalance | Covalent.PoolTokenBalance,
  ): TokenBalance {
    const decimalsAmount = new BigNumber(token.balance)
      .div(10 ** token.contract_decimals)
      .toNumber();
    const tokenPriceUSD = token.quote_rate ? token.quote_rate : null;
    const totalPriceUSD = tokenPriceUSD * decimalsAmount;
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
