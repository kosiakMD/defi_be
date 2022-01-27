import { Injectable } from '@nestjs/common';

import { ChainIdEnum } from '@app/common';

import { concatStrings } from '@app/common/utils';
import { AutofarmStaking } from './autofarm.staking';

@Injectable()
export class AutofarmStakingHARM extends AutofarmStaking {
  chain = ChainIdEnum.harm;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
}
