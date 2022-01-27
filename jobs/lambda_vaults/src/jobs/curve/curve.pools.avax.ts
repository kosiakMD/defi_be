import { Injectable } from '@nestjs/common';

import { ChainIdEnum } from '@app/common';
import { concatStrings } from '@app/common/utils';

import { CurveAddressesAva } from './addresses';
import { CurvePoolBase } from './curve.pool.base';

@Injectable()
export class CurvePoolsAvax extends CurvePoolBase {
  chain = ChainIdEnum.avax;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);

  protected registryV1Contract = CurveAddressesAva.registryV1;
  protected registryV2Contract = CurveAddressesAva.registryV2;
  protected metaPoolFactoryContract = CurveAddressesAva.factoryRegistry;

  protected registryPoolsMap = new Map<string, string>();
}
