import { Injectable } from '@nestjs/common';

import { ICosmosProvider } from '../../../interfaces/cosmos.interface';
import { AbstractCosmosProvider } from './cosmos.provider';

@Injectable()
export class KeplrProvider extends AbstractCosmosProvider implements ICosmosProvider {
  tokenMap = {
    ixo1: 'impacthub',
    agoric1: 'agoric',
    bostrom1: 'cyber',
    somm1: 'sommelier',
    str1: 'straightedge',
  };

  public getUrl(address: string): string {
    return `https://lcd-${this.network}.keplr.app/bank/balances/${address}`;
  }
}
