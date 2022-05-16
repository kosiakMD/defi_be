import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainAbi } from '../../../interfaces/abi.interfaces';
import { AbiFetcherBscscan } from './abi.fetcher.bscscan';
import { AbiFetcherEtherscan } from './abi.fetcher.etherscan';
import { IAbiFetcher } from './abi.fetcher.interface';
import { AbiFetcherTenderly } from './abi.fetcher.tenderly';

@Injectable()
export class AbiFetcherService {
  readonly bbiFetcherList: Array<IAbiFetcher>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly abiFetcherEtherscan: AbiFetcherEtherscan,
    private readonly abiFetcherBscscan: AbiFetcherBscscan,
    private readonly abiFetcherTenderly: AbiFetcherTenderly,
  ) {
    this.bbiFetcherList = new Array<IAbiFetcher>(
      abiFetcherTenderly,
      abiFetcherEtherscan,
      abiFetcherBscscan,
    );
  }

  async fetchAbiAndAbiCode(contract: string): Promise<ChainAbi> {
    for (const abiFetcher of this.bbiFetcherList) {
      try {
        return await abiFetcher.fetchAbiAndAbiCode(contract);
      } catch (e) {
        this.logger.warn(`${abiFetcher.name} error - ${e.message}`);
      }
    }
    return { chain: null, abi: null, abiCode: null };
  }
}
