import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

@Injectable()
export class ProtocolsClassifier {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger) {}

  async classifyProtocol(cfg, abi) {
    //todo implement classification logic based on provided cfg and ABI
    return {
      features: ['farming', 'lending'],
    };
  }
}
