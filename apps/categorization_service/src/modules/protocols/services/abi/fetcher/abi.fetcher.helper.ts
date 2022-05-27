import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainAbi } from '../../../interfaces/abi.interfaces';
import { AbiFetcherBscscan } from './abi.fetcher.bscscan';

@Injectable()
export class AbiFetcherHelper {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly abiFetcherBscscan: AbiFetcherBscscan,
  ) {}

  async fetchUnderlyingForProxy(address: string, chainAbi: ChainAbi): Promise<ChainAbi> {
    if (!this.proxyAbi(chainAbi)) {
      return chainAbi;
    }

    switch (chainAbi.chain) {
      case 'binance': {
        this.logger.debug(`fetching underlying contract ABI for [${address}]`);
        const underlyingContract = await this.getUnderlyingContract(address, chainAbi);
        return this.abiFetcherBscscan.fetchAbiAndAbiCode(underlyingContract);
      }
      default:
        return chainAbi;
    }
  }

  private proxyAbi(chainAbi: ChainAbi): boolean {
    if (!chainAbi.abi) return false;
    if (chainAbi.proxy) return true;
    try {
      const parsedAbi = JSON.parse(chainAbi.abi);
      //todo this check might be improved
      return (
        parsedAbi.length === 2 &&
        parsedAbi[0].type === 'constructor' &&
        parsedAbi[1].type === 'fallback'
      );
    } catch (e) {
      this.logger.warn(`isProxyContractAbi error: [${e.message}]`);
      return false;
    }
  }

  private async getUnderlyingContract(address: string, chainAbi: ChainAbi): Promise<string> {
    if (chainAbi.implementation) {
      return chainAbi.implementation;
    }
    const { implementation } = await this.abiFetcherBscscan.fetchAbiAndAbiCode(address);
    return implementation;
  }
}
