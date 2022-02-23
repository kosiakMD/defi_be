import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { Abis as AbisPancake } from './abis/abis.pancake';
import { Abis as AbisTrisolarisMCV1 } from './abis/abis.trisolaris.mcv1';
import { Abis as AbisTrisolarisMCV2 } from './abis/abis.trisolaris.mcv2';

@Injectable()
export class AbiProvider {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger) {}

  async getAbi(address: string) {
    this.logger.debug('abi for ' + address);
    //todo implement fetching of ABI for the address
    switch (address) {
      case '0x73feaa1ee314f8c655e354234017be2193c9e24e': //pancake
        return AbisPancake;
      case '0x3838956710bcc9D122Dd23863a0549ca8D5675D6': // trisolaris MC V1
        return AbisTrisolarisMCV2;
      default:
        return AbisTrisolarisMCV1; // trisolaris MC V1
    }
  }
}
