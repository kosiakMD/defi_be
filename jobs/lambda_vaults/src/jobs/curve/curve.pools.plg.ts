import { Injectable } from '@nestjs/common';

import { ChainIdEnum } from '@app/common';
import { concatStrings } from '@app/common/utils';

import { CurvePoolBase } from './curve.pool.base';

@Injectable()
export class CurvePoolsPlg extends CurvePoolBase {
  chain = ChainIdEnum.plg;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);

  protected registryPoolsMap = new Map<string, string>();
}
