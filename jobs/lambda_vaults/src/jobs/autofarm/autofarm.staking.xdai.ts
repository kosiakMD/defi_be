import { Injectable } from '@nestjs/common';

import { ChainIdEnum } from '@app/common';
import { concatStrings } from '@app/common/utils';

import { AutofarmStaking } from './autofarm.staking';

@Injectable()
export class AutofarmStakingGNOSIS extends AutofarmStaking {
  chain = ChainIdEnum.gnosis;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
}
