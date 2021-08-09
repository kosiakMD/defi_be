import { MultiCall } from '@indexed-finance/multicall';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import Web3 from 'web3';

import { Inject, Injectable } from '@nestjs/common';

import { Logger } from '../Logger/Logger.service';
import { TokenPrices } from '../balance/interfaces/balance.interfaces';

export type TokenPricesMap = Map<string, TokenPrices[]>;

@Injectable()
export class MulticallService {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger) {}

  public async multicall(
    tokens: string[],
    addresses: string[],
    provider: Web3,
  ): Promise<TokenPricesMap> {
    const multi = new MultiCall(provider);
    const map: TokenPricesMap = new Map<string, TokenPrices[]>();
    for (const address of addresses) {
      const [blockNumber, balances] = await multi.getBalances(tokens, address);
      this.logger.log('Received data via multicall with blockNumber ' + blockNumber);
      const tokenBalances = tokens.map((x) => {
        return {
          [x]: +balances[`${x}`].toBigInt().toString(10),
        };
      });
      map.set(address, tokenBalances);
    }
    return map;
  }
}
