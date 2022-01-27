import { Injectable } from '@nestjs/common';

import { ChainIdEnum } from '@app/common';
import { concatStrings } from '@app/common/utils';

import { CurveAddressesPlg } from './addresses';
import { CurvePoolBase } from './curve.pool.base';

@Injectable()
export class CurvePoolsPlg extends CurvePoolBase {
  chain = ChainIdEnum.plg;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);

  protected registryV1Contract = CurveAddressesPlg.registryV1;
  protected registryV2Contract = CurveAddressesPlg.registryV2;
  protected metaPoolFactoryContract = CurveAddressesPlg.metapoolFactory;

  protected registryPoolsMap = new Map<string, string>();
}
