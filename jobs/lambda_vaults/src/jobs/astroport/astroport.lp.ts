import { Injectable } from '@nestjs/common';

import { ProtocolNameEnum } from '@app/common';
import { concatStrings } from '@app/common/utils';

import { TerraPoolsCommon } from '../terraswap/terra.pools.common.service';
import { AstroportAddresses } from './addresses';

@Injectable()
export class AstroportLp extends TerraPoolsCommon {
  factory = AstroportAddresses.factory;
  totalSupplyLimit = 25000;
  protocol = ProtocolNameEnum.astroport;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);

  mapping = [];
}
