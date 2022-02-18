import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

@Injectable()
export class ProtocolsClassifier {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger) {}

  async classifyProtocol(cfg) {
    //todo implement classification logic based on provided cfg
    const result = { features: [] };
    const { abi } = cfg;
    if (!abi) {
      this.logger.debug(
        `classifyProtocol: abi is missing, classification without ABI is starting... `,
      );
      //todo implement some logic of classification without ABI by taking into account other options
      return result;
    }

    //check if ABI has all required calls to classify protocol as MasterChefFarming
    if (abi['poolLength'] && abi['poolInfo']) {
      result.features.push('MasterChefFarming');
    }
    return result;
  }
}
