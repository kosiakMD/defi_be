import { Injectable } from '@nestjs/common';

import { ICosmosProvider } from '../../../interfaces/cosmos.interface';
import { AbstractCosmosProvider } from './cosmos.provider';

@Injectable()
export class CosmostationProvider extends AbstractCosmosProvider implements ICosmosProvider {
  tokenMap = {
    cosmos1: 'cosmos',
    iaa1: 'iris',
    akash1: 'akash',
    axelar1: 'axelar',
    band1: 'band',
    bcna1: 'bitcanna',
    bitsong1: 'bitsong',
    certik1: 'certik',
    chihuahua1: 'chihuahua',
    comdex1: 'comdex',
    cro1: 'cryptocom',
    desmos1: 'desmos',
    emoney1: 'emoney',
    fetch1: 'fetchai',
    inj1: 'inj',
    juno1: 'juno',
    kava1: 'kava',
    ki1: 'kichain',
    darc1: 'konstellation',
    lum1: 'lum',
    panacea1: 'medibloc',
    osmo1: 'osmosis',
    persistence1: 'persistence',
    regen1: 'regen',
    rizon1: 'rizon',
    secret1: 'secret',
    sent1: 'sentinel',
    sif1: 'sifchain',
    stars1: 'stargaze',
    star1: 'iov',
    umee1: 'umee',
  };

  public getUrl(address: string): string {
    return `https://lcd-${this.network}.cosmostation.io/cosmos/bank/v1beta1/balances/${address}`;
  }
}
