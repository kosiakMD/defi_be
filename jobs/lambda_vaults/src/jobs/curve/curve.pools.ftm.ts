import { Injectable } from '@nestjs/common';

import { ChainIdEnum } from '@app/common';
import { concatStrings } from '@app/common/utils';

import { CurveAddressesFtm } from './addresses';
import { CurvePoolBase } from './curve.pool.base';

@Injectable()
export class CurvePoolsFtm extends CurvePoolBase {
  chain = ChainIdEnum.ftm;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);

  protected registryV1Contract = CurveAddressesFtm.registryV1;
  protected registryV2Contract = CurveAddressesFtm.registryV2;
  protected metaPoolFactoryContract = CurveAddressesFtm.factoryRegistry;

  protected registryPoolsMap = new Map<string, string>();
}
