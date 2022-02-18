import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { Abis } from './abis';
import { Abis as AbisPancake } from './abis_pancake';

@Injectable()
export class AbiFetcher {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger) {}

  async fetchAbi(cfg: any) {
    this.logger.debug('fetch abi for ' + cfg.address);
    //todo implement fetching of ABI for the address:
    //todo use any config params which could be required to fetch the ABI:
    //todo: e.g. explorerUrl, or siteUrl to grab contract from the source etc..
    //todo basically we can implement as many attempts to fetch ABI as we want to
    //todo also if non of required configs are provided we can assume that the protocol doesn't have/require ABI at all
    switch (cfg.address) {
      case '0x73feaa1ee314f8c655e354234017be2193c9e24e':
        return AbisPancake;
      default:
        return Abis;
    }
  }
}
