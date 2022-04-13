import { Injectable } from '@nestjs/common';

import { ProtocolNameEnum } from '@app/common';
import { concatStrings } from '@app/common/utils';

import { TerraSwapAddresses } from './addresses';
import { TerraPoolsCommon } from './terra.pools.common.service';

@Injectable()
export class TerraswapLp extends TerraPoolsCommon {
  factory = TerraSwapAddresses.tokenFactory;
  totalSupplyLimit = 10000;
  protocol = ProtocolNameEnum.terraswap;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);

  mapping = [];
}
