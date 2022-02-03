import { Injectable } from '@nestjs/common';

import { ChainIdEnum } from '@app/common';
import { concatStrings } from '@app/common/utils';

import { CurveNonregisterPoolsBase } from './curve.nonregister.pools.base';

@Injectable()
export class CurvePoolsXdai extends CurveNonregisterPoolsBase {
  chain = ChainIdEnum.xdai;

  placeholder = concatStrings(this.chain, this.protocol, this.feature);
}
